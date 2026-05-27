// Pitch detection from microphone audio using autocorrelation (a simplified
// ACF/AMDF approach). Humming is inherently approximate, so we track pitch
// frame-by-frame, then collapse consecutive same-pitch frames into notes and
// optionally snap to a scale.

const A4 = 440;

function freqToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / A4));
}

/**
 * Autocorrelation pitch detection on a single buffer of float samples.
 * Returns frequency in Hz, or -1 if no clear pitch.
 */
export function detectPitch(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // too quiet -> silence

  // Trim silent edges based on a threshold
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;

  const c = new Array(n).fill(0);
  for (let lag = 0; lag < n; lag++) {
    for (let i = 0; i < n - lag; i++) {
      c[lag] += trimmed[i] * trimmed[i + lag];
    }
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  if (T0 <= 0) return -1;

  // Parabolic interpolation for a better estimate
  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0] || 0;
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const freq = sampleRate / T0;
  if (freq < 65 || freq > 1200) return -1; // outside plausible humming range
  return freq;
}

/**
 * Collapse a sequence of per-frame MIDI readings into note events.
 * pitches: array of midi numbers or null (silence), captured at frameRate Hz.
 * Returns [{ midi, durationQL, isRest }] assuming a quarter note = `quarterMs`.
 */
export function pitchesToMelody(pitches, frameMs, { quarterMs = 500, minFrames = 2 } = {}) {
  const events = [];
  let i = 0;
  while (i < pitches.length) {
    const cur = pitches[i];
    let j = i;
    while (j < pitches.length && pitches[j] === cur) j++;
    const frames = j - i;
    if (frames >= minFrames) {
      const durationQL = (frames * frameMs) / quarterMs;
      if (cur == null) {
        if (events.length > 0) events.push({ midi: null, durationQL, isRest: true });
      } else {
        events.push({ midi: cur, durationQL, isRest: false });
      }
    }
    i = j;
  }
  return events;
}

/**
 * Snap MIDI notes to C major (nearest scale tone). Cleans up wobbly humming.
 */
const C_MAJOR_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
export function snapToScale(events) {
  return events.map((ev) => {
    if (ev.isRest || ev.midi == null) return ev;
    let m = ev.midi;
    for (let delta = 0; delta <= 2; delta++) {
      if (C_MAJOR_PCS.has(((m + delta) % 12 + 12) % 12)) { m = m + delta; break; }
      if (C_MAJOR_PCS.has(((m - delta) % 12 + 12) % 12)) { m = m - delta; break; }
    }
    return { ...ev, midi: m };
  });
}

export { freqToMidi };
