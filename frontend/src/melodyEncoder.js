import { Midi } from "@tonejs/midi";

// ---------------------------------------------------------------------------
// Words -> melody
// ---------------------------------------------------------------------------
// English text has no inherent pitch, so we INVENT a musical mapping. The goal
// is that any nonsense still comes out tonal (sits in a scale) instead of
// chaotic. Each letter maps onto a scale degree, wrapping across octaves so it
// stays in a singable range. Vowels are held slightly longer for a natural
// lilt, spaces become short rests.

const SCALES = {
  // semitone offsets from the tonic
  C_major: [0, 2, 4, 5, 7, 9, 11],
  C_minor: [0, 2, 3, 5, 7, 8, 10],
  C_pentatonic: [0, 2, 4, 7, 9],
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

// Base MIDI pitch for the tonic. 60 = middle C.
const TONIC_MIDI = 60;

/**
 * Convert a string of words into a list of note events.
 * Returns: [{ midi, durationQL, isRest }] using quarter-length durations.
 */
export function wordsToMelody(text, { scaleName = "C_major" } = {}) {
  const scale = SCALES[scaleName] || SCALES.C_major;
  const events = [];

  const lower = (text || "").toLowerCase();
  for (const ch of lower) {
    if (ch === " " || ch === "\n" || ch === "\t") {
      // space -> short rest, but don't start with one
      if (events.length > 0) {
        events.push({ midi: null, durationQL: 0.25, isRest: true });
      }
      continue;
    }
    if (ch < "a" || ch > "z") {
      continue; // ignore punctuation/numbers
    }

    const index = ch.charCodeAt(0) - 97; // 0..25
    const degree = index % scale.length;
    const octaveShift = Math.floor(index / scale.length); // 0,1,2,3
    const midi = TONIC_MIDI + scale[degree] + octaveShift * 12;

    const durationQL = VOWELS.has(ch) ? 0.5 : 0.25; // vowels a touch longer
    events.push({ midi, durationQL, isRest: false });
  }

  return events;
}

// ---------------------------------------------------------------------------
// Note events -> MIDI File (for the existing /generate endpoint)
// ---------------------------------------------------------------------------

/**
 * Build a MIDI File object from note events.
 * events: [{ midi, durationQL, isRest }]
 * Returns a browser File named melody.mid (the backend accepts .mid uploads).
 */
export function melodyToMidiFile(events, { bpm = 120, name = "melody.mid" } = {}) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const track = midi.addTrack();

  const secondsPerQuarter = 60 / bpm;
  let time = 0;
  for (const ev of events) {
    const dur = ev.durationQL * secondsPerQuarter;
    if (!ev.isRest && ev.midi != null) {
      track.addNote({
        midi: ev.midi,
        time,
        duration: Math.max(dur * 0.95, 0.05), // tiny gap so notes are distinct
        velocity: 0.8,
      });
    }
    time += dur;
  }

  const bytes = midi.toArray(); // Uint8Array
  const blob = new Blob([bytes], { type: "audio/midi" });
  return new File([blob], name, { type: "audio/midi" });
}

/**
 * Human-readable note name from MIDI number, for previews.
 */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiToName(m) {
  if (m == null) return "rest";
  const octave = Math.floor(m / 12) - 1;
  return NOTE_NAMES[m % 12] + octave;
}

export { SCALES };
