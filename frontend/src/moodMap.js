// ---------------------------------------------------------------------------
// Mood-aware words -> melody
// ---------------------------------------------------------------------------
// This is NOT language understanding. It is a musically-grounded rule layer:
// the sentiment of the words picks a key + tempo, syllable counts shape the
// rhythm, vowels shape the pitch contour (kept inside the chosen key), and
// punctuation creates phrase breaks. The result is a coherent, tonal seed
// whose MOOD reflects the words. The transformer then continues that seed.

// Small curated sentiment lexicon. Finite by design — unknown words are
// treated as neutral. Scores: positive (+), negative (-), and an "energy"
// dimension (calm vs energetic).
const LEXICON = {
  // positive
  love: { v: 2, e: 1 }, happy: { v: 2, e: 1 }, joy: { v: 2, e: 1 }, joyful: { v: 2, e: 1 },
  bright: { v: 1, e: 1 }, smile: { v: 1, e: 1 }, sunshine: { v: 2, e: 1 }, sun: { v: 1, e: 1 },
  dream: { v: 1, e: 0 }, hope: { v: 1, e: 0 }, sweet: { v: 1, e: 0 }, warm: { v: 1, e: 0 },
  beautiful: { v: 2, e: 0 }, wonderful: { v: 2, e: 1 }, dance: { v: 1, e: 2 }, dancing: { v: 1, e: 2 },
  celebrate: { v: 2, e: 2 }, party: { v: 1, e: 2 }, fun: { v: 1, e: 2 }, laugh: { v: 2, e: 1 },
  good: { v: 1, e: 0 }, great: { v: 1, e: 1 }, free: { v: 1, e: 1 }, alive: { v: 1, e: 2 },
  shine: { v: 1, e: 1 }, gold: { v: 1, e: 0 }, star: { v: 1, e: 0 }, magic: { v: 1, e: 1 },
  // negative
  sad: { v: -2, e: -1 }, cry: { v: -2, e: -1 }, tears: { v: -2, e: -1 }, lonely: { v: -2, e: -1 },
  alone: { v: -1, e: -1 }, dark: { v: -1, e: -1 }, cold: { v: -1, e: -1 }, pain: { v: -2, e: 0 },
  hurt: { v: -2, e: 0 }, broken: { v: -2, e: -1 }, lost: { v: -1, e: -1 }, fear: { v: -2, e: 0 },
  afraid: { v: -2, e: 0 }, miss: { v: -1, e: -1 }, gone: { v: -1, e: -1 }, goodbye: { v: -1, e: -1 },
  empty: { v: -2, e: -2 }, slow: { v: 0, e: -2 }, quiet: { v: 0, e: -2 }, sleep: { v: 0, e: -2 },
  rain: { v: -1, e: -1 }, grey: { v: -1, e: -1 }, gray: { v: -1, e: -1 }, fall: { v: -1, e: 0 },
  die: { v: -2, e: -1 }, death: { v: -2, e: -1 }, sorrow: { v: -2, e: -1 }, weep: { v: -2, e: -1 },
  // energetic (mood-neutral but fast)
  run: { v: 0, e: 2 }, fast: { v: 0, e: 2 }, fire: { v: 0, e: 2 }, fight: { v: -0, e: 2 },
  wild: { v: 0, e: 2 }, loud: { v: 0, e: 2 }, jump: { v: 1, e: 2 }, energy: { v: 0, e: 2 },
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

// Scale definitions (semitone offsets from tonic).
const MOOD_SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

const TONIC_MIDI = 60; // middle C

/** Rough syllable count for a word (vowel-group heuristic). */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.length > 2 && w.endsWith("e")) n = Math.max(1, n - 1); // silent e
  return Math.max(1, n);
}

/**
 * Analyze text -> { valence, energy, scaleName, bpm, label }.
 * valence: negative..positive ; energy: calm..energetic.
 */
export function analyzeMood(text) {
  const words = (text || "").toLowerCase().match(/[a-z']+/g) || [];
  let v = 0;
  let e = 0;
  let hits = 0;
  for (const w of words) {
    const entry = LEXICON[w];
    if (entry) {
      v += entry.v;
      e += entry.e;
      hits++;
    }
  }
  // average over matched words so length doesn't dominate
  if (hits > 0) {
    v = v / hits;
    e = e / hits;
  }

  const scaleName = v < -0.25 ? "minor" : v > 0.25 ? "major" : "pentatonic";

  // tempo from energy: -2..2 maps to ~70..150 bpm
  const bpm = Math.round(110 + e * 20);

  let moodWord;
  if (v > 0.5) moodWord = "bright";
  else if (v < -0.5) moodWord = "melancholy";
  else moodWord = "neutral";
  let energyWord;
  if (e > 0.5) energyWord = "lively";
  else if (e < -0.5) energyWord = "calm";
  else energyWord = "steady";

  const label = hits === 0
    ? "no mood words found — neutral, pentatonic"
    : `${moodWord}, ${energyWord} → ${scaleName}, ${bpm} BPM`;

  return { valence: v, energy: e, scaleName, bpm, label, hits };
}

/**
 * Mood-aware melody. Words shape key/tempo/rhythm/contour.
 * Returns { events, mood } where events match the existing encoder shape:
 *   [{ midi, durationQL, isRest }]
 */
export function wordsToMelodyMood(text) {
  const mood = analyzeMood(text);
  const scale = MOOD_SCALES[mood.scaleName] || MOOD_SCALES.pentatonic;
  const events = [];

  // Split into words while tracking sentence punctuation for phrasing.
  const tokens = (text || "").toLowerCase().match(/[a-z']+|[.,!?;:]/g) || [];

  let contour = 0; // walks up/down the scale for a singable line
  let direction = 1;

  for (const tok of tokens) {
    if (/[.,!?;:]/.test(tok)) {
      // punctuation -> phrase break (rest), longer for sentence-enders
      const restLen = /[.!?]/.test(tok) ? 1.0 : 0.5;
      if (events.length > 0) events.push({ midi: null, durationQL: restLen, isRest: true });
      direction *= -1; // change melodic direction at phrase boundaries
      continue;
    }

    const syl = countSyllables(tok);
    // energetic -> shorter notes; calm -> longer notes
    const baseDur = mood.energy > 0.5 ? 0.25 : mood.energy < -0.5 ? 0.75 : 0.5;

    // one note per syllable, contour walks through the scale
    for (let s = 0; s < syl; s++) {
      contour += direction;
      if (contour >= scale.length) { contour = scale.length - 2; direction = -1; }
      if (contour < 0) { contour = 1; direction = 1; }

      const degree = ((contour % scale.length) + scale.length) % scale.length;
      const octave = Math.floor(contour / scale.length);
      const midi = TONIC_MIDI + scale[degree] + octave * 12;

      // vowels in the word nudge duration slightly for natural lilt
      const dur = baseDur * (s === 0 ? 1.0 : 0.85);
      events.push({ midi, durationQL: dur, isRest: false });
    }
    // tiny gap between words
    events.push({ midi: null, durationQL: 0.15, isRest: true });
  }

  return { events, mood };
}

export { MOOD_SCALES };
