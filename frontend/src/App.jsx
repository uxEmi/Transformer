import { useEffect, useState } from "react";
import { fetchSeeds, generate, fetchBpePatterns } from "./api";

import SeedSelector from "./components/SeedSelector";
import ControlPanel from "./components/ControlPanel";
import MidiPlayer from "./components/MidiPlayer";
import TokenStream from "./components/TokenStream";
import ProbabilityBars from "./components/ProbabilityBars";
import AttentionHeatmap from "./components/AttentionHeatmap";
import BpeMergesPanel from "./components/BpeMergesPanel";

export default function App() {
  // Seeds list
  const [seeds, setSeeds] = useState([]);
  const [selectedSeed, setSelectedSeed] = useState("");

  // Generation parameters
  const [temperature, setTemperature] = useState(0.8);
  const [sampling, setSampling] = useState("top_p");
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.9);

  // Generation result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // BPE patterns (from week-1 work)
  const [bpePatterns, setBpePatterns] = useState([]);

  // Load seeds + BPE patterns on mount
  useEffect(() => {
    fetchSeeds()
      .then((s) => {
        setSeeds(s);
        if (s.length > 0) setSelectedSeed(s[0].id);
      })
      .catch((e) => setError("Failed to load seeds: " + e.message));
    fetchBpePatterns()
      .then(setBpePatterns)
      .catch(() => {}); // non-critical
  }, []);

  async function handleGenerate() {
    if (!selectedSeed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    try {
      const data = await generate({
        seedId: selectedSeed,
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
        <SeedSelector
          seeds={seeds}
          selected={selectedSeed}
          onChange={setSelectedSeed}
        />
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
          disabled={loading || !selectedSeed}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="results">
          <MidiPlayer
            midiBase64={result.midi_base64}
            seedTokenCount={result.seed_tokens.length}
          />
          <TokenStream
            seedTokens={result.seed_tokens}
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
              allTokens={[...result.seed_tokens, ...result.generated_tokens.slice(0, currentStep + 1)]}
            />
          </div>
        </section>
      )}

      <aside className="bpe-section">
        <BpeMergesPanel patterns={bpePatterns} />
      </aside>
    </div>
  );
}
