export default function AttentionHeatmap({ step, allTokens }) {
  if (!step) return null;
  const attentionRow = (step.attention && step.attention[0]) || [];
  const maxAttn = Math.max(...attentionRow, 0.0001);

  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem" }}>Attention (step {step.step})</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
        Which earlier tokens did the model attend to when picking this one?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {attentionRow.map((weight, i) => {
          const intensity = weight / maxAttn;
          const bg = `rgba(99, 102, 241, ${intensity.toFixed(3)})`;
          const tokenLabel = allTokens[i] ?? "?";
          return (
            <div
              key={i}
              title={`${tokenLabel}: ${weight.toFixed(4)}`}
              style={{
                background: bg,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "4px 6px",
                fontSize: "0.7rem",
                fontFamily: "SF Mono, monospace",
                borderRadius: 3,
                minWidth: 22,
                textAlign: "center",
              }}
            >
              {displayToken(tokenLabel)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function displayToken(t) {
  return (t ?? "").replace(/\n/g, "↵").replace(/ /g, "·") || "∅";
}
