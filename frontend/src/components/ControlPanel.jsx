export default function ControlPanel({
  temperature, setTemperature,
  sampling, setSampling,
  topK, setTopK,
  topP, setTopP,
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
      <label>
        Temperature ({temperature.toFixed(2)})
        <input
          type="range"
          min="0.1"
          max="1.5"
          step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
        />
      </label>

      <label>
        Sampling strategy
        <select value={sampling} onChange={(e) => setSampling(e.target.value)}>
          <option value="greedy">Greedy (deterministic)</option>
          <option value="top_k">Top-k</option>
          <option value="top_p">Top-p (nucleus)</option>
        </select>
      </label>

      {sampling === "top_k" && (
        <label>
          Top-k
          <input
            type="number"
            min="1"
            max="200"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10) || 1)}
          />
        </label>
      )}

      {sampling === "top_p" && (
        <label>
          Top-p ({topP.toFixed(2)})
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
