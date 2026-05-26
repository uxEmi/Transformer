"""
Format conversion: ABC notation -> MIDI bytes -> base64.

The frontend wants base64-encoded MIDI it can hand to Tone.js. The model
generates ABC notation (or text that contains ABC). This module bridges
the two formats using music21.

If you swap the pretrained model for one that outputs raw MIDI tokens
(REMI-style), you'd add a tokens_to_midi function here instead.
"""

import io
import re

try:
    from music21 import converter, midi
except ImportError:
    converter = None
    midi = None


def tokens_to_abc(generated_text: str) -> str:
    """
    Clean up model output into valid ABC notation.

    GPT-style models often produce extra text around the ABC. We extract
    what looks like ABC: lines starting with letters/digits/bar lines, no prose.

    TODO Person A: tune this to whichever model you pick.
    """
    lines = generated_text.split("\n")
    abc_lines = []
    in_header = True
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # ABC headers look like "X:1", "T:Tune", "M:4/4", "K:C"
        if re.match(r"^[A-Z]:", line):
            abc_lines.append(line)
            continue
        # Music lines have notes (letters) and bars (|), no English prose
        if re.match(r"^[A-Ga-g\d\s|/^_=,'\.\-\(\)\[\]:]+$", line):
            abc_lines.append(line)
            in_header = False
        elif not in_header:
            break  # hit prose after the music; stop

    if not abc_lines or not any(l.startswith("X:") for l in abc_lines):
        # Fallback: wrap in a minimal valid ABC header
        return "X:1\nT:Generated\nM:4/4\nL:1/8\nK:C\n" + generated_text

    return "\n".join(abc_lines)


def abc_to_midi_bytes(abc_text: str) -> bytes:
    """Convert ABC notation -> MIDI file bytes via music21."""
    if converter is None:
        # music21 isn't installed; return empty MIDI so the app doesn't crash
        return b""

    try:
        score = converter.parse(abc_text, format="abc")
        mf = midi.translate.streamToMidiFile(score)
        buf = io.BytesIO()
        mf.openFileLike(buf)
        mf.write()
        mf.close()
        return buf.getvalue()
    except Exception as e:
        print(f"[midi_utils] Failed to convert ABC to MIDI: {e}")
        print(f"[midi_utils] Offending ABC:\n{abc_text}")
        return b""
