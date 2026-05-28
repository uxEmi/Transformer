import { useState } from "react";
import { generate } from "./api";
import { melodyToMidiFile } from "./melodyEncoder";

import ControlPanel from "./components/ControlPanel";
import MidiPlayer from "./components/MidiPlayer";
import TokenStream from "./components/TokenStream";
import ProbabilityBars from "./components/ProbabilityBars";
import AttentionHeatmap from "./components/AttentionHeatmap";
import TextInput from "./components/TextInput";
import VoiceInput from "./components/VoiceInput";
import ClassicsPicker from "./components/ClassicsPicker";

const TABS = [
  // { id: "text", label: "Write" },   // hidden — mood/lyrics feature kept in code (TextInput.jsx, moodMap.js)
  { id: "voice", label: "Hum" },
  { id: "classics", label: "Classics" },
  { id: "upload", label: "Upload" },
];

function SectionHead({ num, title }) {
  return (
    <div className="section-head">
      <span className="section-num">{num}.</span>
      <span className="section-title">{title}</span>
      <span className="section-rule" />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("upload");

  const [textEvents, setTextEvents] = useState([]);
  const [textBpm, setTextBpm] = useState(120);
  const [voiceEvents, setVoiceEvents] = useState([]);
  const [classicsEvents, setClassicsEvents] = useState([]);
  const [classicsBpm, setClassicsBpm] = useState(120);
  const [uploadFile, setUploadFile] = useState(null);

  const [temperature, setTemperature] = useState(0.8);
  const [sampling, setSampling] = useState("top_p");
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.9);
  const [maxNewTokens, setMaxNewTokens] = useState(50);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  function buildInputFile() {
    if (tab === "upload") return uploadFile;
    let events, bpm;
    if (tab === "text") { events = textEvents; bpm = textBpm; }
    else if (tab === "voice") { events = voiceEvents; bpm = 120; }
    else if (tab === "classics") { events = classicsEvents; bpm = classicsBpm; }
    else return null;
    const playable = events.filter((e) => !e.isRest);
    if (playable.length === 0) return null;
    return melodyToMidiFile(events, { bpm });
  }

  const canGenerate = (() => {
    if (loading) return false;
    if (tab === "upload") return !!uploadFile;
    const events = tab === "text" ? textEvents
                  : tab === "voice" ? voiceEvents
                  : classicsEvents;
    return events.some((e) => !e.isRest);
  })();

  async function handleGenerate() {
    const file = buildInputFile();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    try {
      const data = await generate({
        file,
        temperature,
        sampling,
        topK,
        topP,
        maxNewTokens,
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
        <div>
          <h1>Melody <em>Continuer</em></h1>
          <p className="subtitle">
            Write it, hum it, or upload it &mdash; then let the transformer carry it onward.
          </p>
        </div>
        <div className="masthead-meta">
          <div><strong>Vol. I</strong></div>
          <div>distilgpt2 &middot; abc-irish</div>
          <div>est. 2025</div>
        </div>
      </header>

      <section className="controls">
        <div>
          <SectionHead num="I" title="The Seed" />
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tab-body">
            {tab === "text" && <TextInput onMelodyReady={setTextEvents} onBpmChange={setTextBpm} />}
            {tab === "voice" && <VoiceInput onMelodyReady={setVoiceEvents} />}
            {tab === "classics" && (
              <ClassicsPicker
                onMelodyReady={setClassicsEvents}
                onBpmChange={setClassicsBpm}
              />
            )}
            {tab === "upload" && (
              <div className="input-pane">
                <p className="pane-hint">Upload a <strong>.mid</strong> or <strong>.midi</strong> file (max 1 MB).</p>
                <input
                  type="file"
                  accept=".mid,.midi"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                {uploadFile && <p className="char-hint">{uploadFile.name}</p>}
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHead num="II" title="Parameters" />
          <ControlPanel
            temperature={temperature}
            setTemperature={setTemperature}
            sampling={sampling}
            setSampling={setSampling}
            topK={topK}
            setTopK={setTopK}
            topP={topP}
            setTopP={setTopP}
            maxNewTokens={maxNewTokens}
            setMaxNewTokens={setMaxNewTokens}
          />
        </div>

        <div>
          <button className="generate-btn" onClick={handleGenerate} disabled={!canGenerate}>
            {loading ? "Composing" : "Continue the melody"}
          </button>
          {error && <div className="error" style={{ marginTop: "1rem" }}>{error}</div>}
        </div>
      </section>

      {result && (
        <section className="results">
          <div>
            <SectionHead num="III" title="The Continuation" />
            <MidiPlayer
              midiBase64={result.midi_base64}
              seedTokenCount={result.input_tokens.length}
            />
          </div>

          <div>
            <SectionHead num="IV" title="Tokens" />
            <TokenStream
              seedTokens={result.input_tokens}
              generatedTokens={result.generated_tokens}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />
          </div>

          <div>
            <SectionHead num="V" title="Under the hood" />
            <div className="viz-grid">
              <ProbabilityBars step={result.steps[currentStep]} />
              <AttentionHeatmap
                step={result.steps[currentStep]}
                allTokens={[
                  ...result.input_tokens,
                  ...result.generated_tokens.slice(0, currentStep + 1),
                ]}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}