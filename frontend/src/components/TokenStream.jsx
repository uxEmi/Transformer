import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export default function MidiPlayer({ midiBase64, seedTokenCount }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const synthRef = useRef(null);
  const partsRef = useRef([]);

  useEffect(() => {
    return () => stopAndCleanup();
  }, [midiBase64]);

  function stopAndCleanup() {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    partsRef.current.forEach((p) => p.dispose());
    partsRef.current = [];
    if (synthRef.current) {
      synthRef.current.dispose();
      synthRef.current = null;
    }
    setPlaying(false);
  }

  async function handlePlay() {
    if (!midiBase64) return;
    if (playing) {
      stopAndCleanup();
      return;
    }

    await Tone.start();
    stopAndCleanup();

    const binary = atob(midiBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let midi;
    try {
      midi = new Midi(bytes);
    } catch (e) {
      console.error("Failed to parse MIDI", e);
      return;
    }

    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synthRef.current = synth;

    midi.tracks.forEach((track) => {
      const part = new Tone.Part((time, note) => {
        synth.triggerAttackRelease(note.name, note.duration, time, note.velocity);
      }, track.notes.map((n) => [n.time, n]));
      part.start(0);
      partsRef.current.push(part);
    });

    setDuration(midi.duration);
    Tone.Transport.start();
    setPlaying(true);

    Tone.Transport.scheduleOnce(() => {
      stopAndCleanup();
    }, midi.duration + 0.5);
  }

  function downloadMidi() {
    const binary = atob(midiBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "melody.mid";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!midiBase64) return null;

  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem" }}>Audio</h3>
      <button onClick={handlePlay} style={{ marginRight: "0.5rem" }}>
        {playing ? "⏸ Stop" : "▶ Play"}
      </button>
      <button onClick={downloadMidi}>⬇ Download MIDI</button>
      {duration > 0 && (
        <p style={{ color: "var(--ink-soft)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          Duration: {duration.toFixed(1)}s · Seed: {seedTokenCount} tokens
        </p>
      )}
    </div>
  );
}