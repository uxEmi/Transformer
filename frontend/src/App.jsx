import { useState } from "react";
import { generate } from "./api";

import ControlPanel from "./components/ControlPanel";
import MidiPlayer from "./components/MidiPlayer";
import TokenStream from "./components/TokenStream";
import ProbabilityBars from "./components/ProbabilityBars";
import AttentionHeatmap from "./components/AttentionHeatmap";

export default function App() {
  const [midiFile, setMidiFile] = useState(null);

  const [temperature, setTemperature] = useState(0.8);
  const [sampling, setSampling] = useState("top_p");
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.9);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  async function handleGenerate() {
    if (!midiFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    try {
      const data = await generate({
        file: midiFile,
        temperature,
        sampling,
        topK,
        topP,
      });
      setResult(data);
    } catch (e) {
      setError("Generation failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Melody Continuer</h1>
        <p className="subtitle">
          BPE + embeddings + transformer attention, end to end.
        </p>
      </header>

      <section className="controls">
        <label>
          MIDI file
          <input
            type="file"
            accept=".mid,.midi"
            onChange={(e) => setMidiFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <ControlPanel
          temperature={temperature}
          setTemperature={setTemperature}
          sampling={sampling}
          setSampling={setSampling}
          topK={topK}
          setTopK={setTopK}
          topP={topP}
          setTopP={setTopP}
        />
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={loading || !midiFile}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="results">
          <MidiPlayer
            midiBase64={result.midi_base64}
            seedTokenCount={result.input_tokens.length}
          />
          <TokenStream
            seedTokens={result.input_tokens}
            generatedTokens={result.generated_tokens}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
          <div className="viz-grid">
            <ProbabilityBars
              step={result.steps[currentStep]}
            />
            <AttentionHeatmap
              step={result.steps[currentStep]}
              allTokens={[...result.input_tokens, ...result.generated_tokens.slice(0, currentStep + 1)]}
            />
          </div>
        </section>
      )}
    </div>
  );
}
