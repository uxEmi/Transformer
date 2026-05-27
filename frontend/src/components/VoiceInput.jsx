import { useRef, useState } from "react";
import { detectPitch, freqToMidi, pitchesToMelody, snapToScale } from "../pitchDetect";
import MelodyPreview from "./MelodyPreview";

const FRAME_MS = 50; // analyze pitch ~20x/sec

export default function VoiceInput({ onMelodyReady }) {
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [snap, setSnap] = useState(true);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState(0);

  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const pitchesRef = useRef([]);
  const lastFrameRef = useRef(0);

  async function start() {
    setError(null);
    setEvents([]);
    pitchesRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Float32Array(analyser.fftSize);
      lastFrameRef.current = performance.now();

      const loop = () => {
        const now = performance.now();
        if (now - lastFrameRef.current >= FRAME_MS) {
          lastFrameRef.current = now;
          analyser.getFloatTimeDomainData(buf);

          let rms = 0;
          for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          setLevel(Math.min(Math.sqrt(rms / buf.length) * 4, 1));

          const freq = detectPitch(buf, ctx.sampleRate);
          pitchesRef.current.push(freq > 0 ? freqToMidi(freq) : null);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
      setRecording(true);
    } catch (e) {
      setError("Microphone access failed: " + e.message);
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    rafRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    setRecording(false);
    setLevel(0);

    let ev = pitchesToMelody(pitchesRef.current, FRAME_MS, { quarterMs: 500, minFrames: 2 });
    if (snap) ev = snapToScale(ev);
    setEvents(ev);
    onMelodyReady(ev);
  }

  return (
    <div className="input-pane">
      <p className="pane-hint">
        Hum or sing a short melody. The browser tracks your pitch and turns it into
        notes — humming is approximate, so "snap to scale" cleans up the wobble.
      </p>

      <div className="voice-controls">
        <button
          className={recording ? "rec-btn recording" : "rec-btn"}
          onClick={recording ? stop : start}
        >
          {recording ? "■ Stop & convert" : "● Record"}
        </button>
        {recording && (
          <div className="level-meter">
            <div className="level-fill" style={{ width: `${level * 100}%` }} />
          </div>
        )}
        <label className="inline-label checkbox">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          Snap to scale
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <MelodyPreview events={events} onClear={() => { setEvents([]); onMelodyReady([]); }} />
    </div>
  );
}
