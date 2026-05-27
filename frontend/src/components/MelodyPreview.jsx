import { useRef, useState } from "react";
import * as Tone from "tone";
import { midiToName } from "../melodyEncoder";

export default function MelodyPreview({ events, bpm = 120, onClear }) {
  const [playing, setPlaying] = useState(false);
  const synthRef = useRef(null);
  const partRef = useRef(null);

  if (!events || events.length === 0) return null;

  const notes = events.filter((e) => !e.isRest);
  const midis = notes.map((n) => n.midi);
  const minMidi = Math.min(...midis);
  const maxMidi = Math.max(...midis);
  const range = Math.max(maxMidi - minMidi, 1);

  function cleanup() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (partRef.current) { partRef.current.dispose(); partRef.current = null; }
    if (synthRef.current) { synthRef.current.dispose(); synthRef.current = null; }
    setPlaying(false);
  }

  async function play() {
    if (playing) { cleanup(); return; }
    await Tone.start();
    cleanup();

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synthRef.current = synth;

    const secPerQ = 60 / bpm;
    const scheduled = [];
    let t = 0;
    for (const ev of events) {
      const dur = ev.durationQL * secPerQ;
      if (!ev.isRest && ev.midi != null) {
        scheduled.push([t, { name: midiToName(ev.midi), duration: Math.max(dur * 0.95, 0.05) }]);
      }
      t += dur;
    }

    const part = new Tone.Part((time, n) => {
      synth.triggerAttackRelease(n.name, n.duration, time);
    }, scheduled);
    part.start(0);
    partRef.current = part;

    Tone.Transport.start();
    setPlaying(true);
    Tone.Transport.scheduleOnce(() => cleanup(), t + 0.5);
  }

  return (
    <div className="melody-preview">
      <div className="melody-preview-head">
        <span className="melody-preview-label">
          {notes.length} note{notes.length === 1 ? "" : "s"}
        </span>
        <div className="melody-preview-actions">
          <button className="ghost-btn" onClick={play}>
            {playing ? "■ Stop" : "▶ Preview"}
          </button>
          {onClear && (
            <button className="ghost-btn" onClick={() => { cleanup(); onClear(); }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <div className="pianoroll">
        {(() => {
          const totalQL = events.reduce((s, e) => s + e.durationQL, 0) || 1;
          const PXPERQL = 40;
          let x = 0;
          const blocks = [];
          events.forEach((ev, i) => {
            const w = ev.durationQL * PXPERQL;
            if (!ev.isRest && ev.midi != null) {
              const top = 100 - ((ev.midi - minMidi) / range) * 100;
              blocks.push(
                <div
                  key={i}
                  className="roll-note"
                  title={midiToName(ev.midi)}
                  style={{
                    left: x,
                    width: Math.max(w - 2, 4),
                    top: `${top * 0.8 + 8}%`,
                  }}
                />
              );
            }
            x += w;
          });
          return (
            <div className="roll-inner" style={{ width: Math.max(totalQL * PXPERQL, 100) }}>
              {blocks}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
