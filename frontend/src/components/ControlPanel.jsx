export default function ControlPanel({
  temperature, setTemperature,
  sampling, setSampling,
  topK, setTopK,
  topP, setTopP,
  maxNewTokens, setMaxNewTokens,
}) {
  return (
    <div className="params-grid">
      <label>
        <span>Temperature <span className="val">{temperature.toFixed(2)}</span></span>
        <input
          type="range"
          min="0.1" max="1.5" step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
        />
      </label>

      <label>
        <span>Sampling</span>
        <select value={sampling} onChange={(e) => setSampling(e.target.value)}>
          <option value="greedy">Greedy</option>
          <option value="top_k">Top-k</option>
          <option value="top_p">Top-p (nucleus)</option>
        </select>
      </label>

      <label>
        <span>Length <span className="val">{maxNewTokens} tokens</span></span>
        <input
          type="range"
          min="1" max="200" step="1"
          value={maxNewTokens}
          onChange={(e) => setMaxNewTokens(parseInt(e.target.value, 10) || 1)}
        />
      </label>

      {sampling === "top_k" && (
        <label>
          <span>Top-k <span className="val">{topK}</span></span>
          <input
            type="range"
            min="1" max="200" step="1"
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value, 10) || 1)}
          />
        </label>
      )}

      {sampling === "top_p" && (
        <label>
          <span>Top-p <span className="val">{topP.toFixed(2)}</span></span>
          <input
            type="range"
            min="0.1" max="1.0" step="0.05"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}