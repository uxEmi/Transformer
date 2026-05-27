import { useState } from "react";
import { CLASSICS } from "../classics";
import MelodyPreview from "./MelodyPreview";

export default function ClassicsPicker({ onMelodyReady, onBpmChange }) {
  const [selectedId, setSelectedId] = useState(null);

  const selected = CLASSICS.find((c) => c.id === selectedId) || null;

  function pick(c) {
    setSelectedId(c.id);
    onMelodyReady(c.events);
    onBpmChange?.(c.bpm);
  }

  return (
    <div className="input-pane">
      <p className="pane-hint">
        Choose a well-known melody and the transformer will continue it in its own
        Irish-folk voice. These are <strong>real tunes</strong> &mdash; not generated from
        text &mdash; encoded note-for-note.
      </p>

      <div className="classics-grid">
        {CLASSICS.map((c) => (
          <button
            key={c.id}
            className={`classic-card ${selectedId === c.id ? "selected" : ""}`}
            onClick={() => pick(c)}
          >
            <span className="classic-name">{c.name}</span>
            <span className="classic-note">{c.note}</span>
            <span className="classic-meta">{c.events.filter(e => !e.isRest).length} notes &middot; {c.bpm} BPM</span>
          </button>
        ))}
      </div>

      {selected && (
        <MelodyPreview
          events={selected.events}
          bpm={selected.bpm}
          onClear={() => { setSelectedId(null); onMelodyReady([]); }}
        />
      )}
    </div>
  );
}
