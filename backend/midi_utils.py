import io
import os
import re
import tempfile
from typing import List

try:
    from music21 import converter, midi, stream, note as m21note, tempo as m21tempo, meter as m21meter
except ImportError:
    converter = None
    midi = None
    stream = None
    m21note = None
    m21tempo = None
    m21meter = None


MAX_INPUT_SECONDS = 30.0

_ABC_DEFAULT_L = "1/8"
_ABC_L_QUARTER_MULTIPLIER = 2


def _pitch_to_abc(midi_pitch: int) -> str:
    pc_to_letter = {
        0: ("C", ""), 1: ("C", "^"),
        2: ("D", ""), 3: ("D", "^"),
        4: ("E", ""),
        5: ("F", ""), 6: ("F", "^"),
        7: ("G", ""), 8: ("G", "^"),
        9: ("A", ""), 10: ("A", "^"),
        11: ("B", ""),
    }
    midi_pitch = max(0, min(127, int(midi_pitch)))
    octave = midi_pitch // 12 - 1
    pc = midi_pitch % 12
    letter, accidental = pc_to_letter[pc]

    if octave <= 4:
        body = letter + "," * max(0, 4 - octave)
    else:
        body = letter.lower() + "'" * max(0, octave - 5)
    return accidental + body


def _duration_to_abc(quarter_length: float) -> str:
    eighths = quarter_length * _ABC_L_QUARTER_MULTIPLIER
    halved = round(eighths * 2)
    if halved <= 0:
        return ""
    if halved == 2:
        return ""
    if halved % 2 == 0:
        return str(halved // 2)
    return f"{halved}/2"


def _stream_to_abc(notes_with_offsets, bpm: float, title: str = "Input") -> str:
    lines = [
        "X:1",
        f"T:{title}",
        "M:4/4",
        f"Q:1/4={int(round(bpm))}",
        f"L:{_ABC_DEFAULT_L}",
        "K:C",
    ]

    body_tokens = []
    cursor = 0.0
    for offset, pitch, qL in notes_with_offsets:
        gap = offset - cursor
        if gap > 0.01:
            body_tokens.append("z" + _duration_to_abc(gap))
        body_tokens.append(_pitch_to_abc(pitch) + _duration_to_abc(qL))
        cursor = offset + qL

    lines.append(" ".join(body_tokens) + " |]")
    return "\n".join(lines) + "\n"


def midi_bytes_to_abc(midi_bytes: bytes, max_seconds: float = MAX_INPUT_SECONDS) -> str:
    if converter is None:
        raise RuntimeError("music21 is not installed")

    mf = midi.MidiFile()
    mf.openFileLike(io.BytesIO(midi_bytes))
    mf.read()
    mf.close()
    score = midi.translate.midiFileToStream(mf)

    bpm = 120.0
    for t in score.recurse().getElementsByClass("MetronomeMark"):
        if t.number:
            bpm = float(t.number)
            break
    quarters_per_second = bpm / 60.0
    max_quarters = max_seconds * quarters_per_second

    flat = score.flatten().notes

    notes_with_offsets = []
    for n in flat:
        if n.offset > max_quarters:
            break
        if n.isNote:
            pitch_midi = int(round(n.pitch.ps))
        elif n.isChord:
            pitch_midi = int(round(max(p.ps for p in n.pitches)))
        else:
            continue
        notes_with_offsets.append((float(n.offset), pitch_midi, float(n.quarterLength)))

    if not notes_with_offsets:
        return "X:1\nT:Empty\nM:4/4\nL:1/8\nK:C\nz8 |]\n"

    return _stream_to_abc(notes_with_offsets, bpm=bpm)


_ABC_BODY_RE = re.compile(r"^[A-Ga-gz\d\s|/^_=,'\.\-\(\)\[\]:!]+$")


def tokens_to_abc(generated_text: str) -> str:
    lines = generated_text.split("\n")
    header_lines: List[str] = []
    body_lines: List[str] = []
    saw_K = False

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if not saw_K:
            if re.match(r"^[A-Z]:", line):
                header_lines.append(line)
                if line.startswith("K:"):
                    saw_K = True
            continue
        if line.startswith("X:") or not _ABC_BODY_RE.match(line):
            break
        body_lines.append(line)

    if not header_lines or not saw_K:
        return "X:1\nT:Generated\nM:4/4\nL:1/8\nK:C\n" + generated_text + "\n"

    body = " ".join(body_lines)
    body = re.sub(r"\|+\s*\]?", "|", body)
    body = re.sub(r"\s+", " ", body).strip(" |")
    body = body + " |]"

    return "\n".join(header_lines) + "\n" + body + "\n"


_LETTER_TO_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_ABC_TOKEN_RE = re.compile(
    r"(?P<acc>[\^_=]?)(?P<letter>[A-Ga-gz])(?P<octave>[,']*)"
    r"(?P<num>\d*)(?P<slash>/?)(?P<den>\d*)"
)


def _parse_abc_body_to_stream(body: str, bpm: float, default_l: float = 0.5):
    if stream is None:
        raise RuntimeError("music21 is not installed")

    s = stream.Stream()
    s.append(m21tempo.MetronomeMark(number=bpm))
    s.append(m21meter.TimeSignature("4/4"))

    cursor = 0.0
    cleaned = re.sub(r"[!\-\(\)\[\]]", " ", body)
    cleaned = cleaned.replace("|]", " ").replace("||", " ").replace("|", " ")

    i = 0
    while i < len(cleaned):
        ch = cleaned[i]
        if ch.isspace():
            i += 1
            continue
        if ch not in "ABCDEFGabcdefgz^_=":
            i += 1
            continue
        m = _ABC_TOKEN_RE.match(cleaned, i)
        if not m or not m.group("letter"):
            i += 1
            continue

        letter = m.group("letter")
        acc = m.group("acc")
        octave_marks = m.group("octave")
        num = m.group("num")
        slash = m.group("slash")
        den = m.group("den")

        multiplier = 1.0
        if num:
            multiplier = float(num)
        if slash:
            divisor = float(den) if den else 2.0
            multiplier = multiplier / divisor
        duration_qL = multiplier * default_l

        if letter == "z":
            cursor += duration_qL
        else:
            base_octave = 4 if letter.isupper() else 5
            octave = base_octave + octave_marks.count("'") - octave_marks.count(",")
            pc = _LETTER_TO_PC[letter.upper()]
            if acc == "^":
                pc += 1
            elif acc == "_":
                pc -= 1
            midi_pitch = max(0, min(127, octave * 12 + pc + 12))
            n = m21note.Note()
            n.pitch.midi = midi_pitch
            n.quarterLength = duration_qL
            s.insert(cursor, n)
            cursor += duration_qL

        i = m.end()

    return s


def _extract_abc_components(abc_text: str):
    header = {}
    body_lines = []
    saw_K = False
    for line in abc_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if not saw_K:
            m = re.match(r"^([A-Z]):\s*(.+)$", line)
            if m:
                header[m.group(1)] = m.group(2)
                if m.group(1) == "K":
                    saw_K = True
            continue
        if line.startswith("X:"):
            break
        body_lines.append(line)
    return header, " ".join(body_lines)


def abc_to_midi_bytes(abc_text: str) -> bytes:
    if stream is None:
        return b""

    try:
        header, body = _extract_abc_components(abc_text)
        if not body:
            return b""

        bpm = 120.0
        q = header.get("Q", "")
        m = re.search(r"(\d+)\s*$", q)
        if m:
            bpm = float(m.group(1))

        default_l = 0.5
        l_str = header.get("L", "1/8")
        m = re.match(r"(\d+)\s*/\s*(\d+)", l_str)
        if m:
            num, den = int(m.group(1)), int(m.group(2))
            default_l = (num / den) * 4.0

        s = _parse_abc_body_to_stream(body, bpm=bpm, default_l=default_l)

        with tempfile.NamedTemporaryFile(suffix=".mid", delete=False) as tf:
            mid_path = tf.name
        try:
            s.write("midi", fp=mid_path)
            with open(mid_path, "rb") as f:
                return f.read()
        finally:
            try:
                os.unlink(mid_path)
            except OSError:
                pass
    except Exception as e:
        print(f"[midi_utils] Failed to convert ABC to MIDI: {e}")
        print(f"[midi_utils] Offending ABC:\n{abc_text}")
        return b""
