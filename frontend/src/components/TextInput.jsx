import { useState, useEffect } from "react";
import { wordsToMelody, SCALES } from "../melodyEncoder";
import { wordsToMelodyMood } from "../moodMap";
import MelodyPreview from "./MelodyPreview";

export default function TextInput({ onMelodyReady, onBpmChange }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("mood"); // "mood" | "literal"
  const [scaleName, setScaleName] = useState("C_major");
  const [events, setEvents] = useState([]);
  const [moodLabel, setMoodLabel] = useState("");
  const [bpm, setBpm] = useState(120);

  useEffect(() => {
    if (mode === "mood") {
      const { events: ev, mood } = wordsToMelodyMood(text);
      setEvents(ev);
      setMoodLabel(mood.label);
      setBpm(mood.bpm);
      onMelodyReady(ev);
      onBpmChange?.(mood.bpm);
    } else {
      const ev = wordsToMelody(text, { scaleName });
      setEvents(ev);
      setMoodLabel("");
      setBpm(120);
      onMelodyReady(ev);
      onBpmChange?.(120);
    }
  }, [text, mode, scaleName]);

  return (
    <div className="input-pane">
      <p className="pane-hint">
        Type any words or lyrics. In <strong>Mood-aware</strong> mode the feeling of
        your words picks the key, tempo and rhythm; in <strong>Literal</strong> mode
        each letter maps to a note. The transformer then continues whatever it's given.
      </p>

      <div className="mode-switch">
        <button
          className={`seg ${mode === "mood" ? "active" : ""}`}
          onClick={() => setMode("mood")}
        >
          Mood-aware
        </button>
        <button
          className={`seg ${mode === "literal" ? "active" : ""}`}
          onClick={() => setMode("literal")}
        >
          Literal letters
        </button>
      </div>

      <textarea
        className="lyric-input"
        rows={3}
        placeholder={mode === "mood" ? "i miss you, the rain falls slow..." : "twinkle twinkle little star..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="pane-row">
        {mode === "mood" ? (
          <span className="mood-readout">
            {text.trim() ? <>{"\uD83C\uDFBC "}{moodLabel}</> : "Type something to hear its mood"}
          </span>
        ) : (
          <label className="inline-label">
            Scale
            <select value={scaleName} onChange={(e) => setScaleName(e.target.value)}>
              {Object.keys(SCALES).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </label>
        )}
        <span className="char-hint">{text.replace(/[^a-zA-Z]/g, "").length} letters</span>
      </div>

      <MelodyPreview events={events} bpm={bpm} onClear={() => setText("")} />
    </div>
  );
}