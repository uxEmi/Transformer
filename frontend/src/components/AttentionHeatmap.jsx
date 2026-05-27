export default function AttentionHeatmap({ step, allTokens }) {
  if (!step) return null;
  const attentionRow = (step.attention && step.attention[0]) || [];
  const maxAttn = Math.max(...attentionRow, 0.0001);

  return (
    <div>
      <h3>Attention &mdash; step {step.step}</h3>
      <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", fontFamily: "var(--serif)", fontStyle: "italic", marginTop: 0 }}>
        Which earlier tokens did the model attend to when picking this one?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {attentionRow.map((weight, i) => {
          const intensity = weight / maxAttn;
          const bg = `rgba(122, 31, 43, ${intensity.toFixed(3)})`;
          const tokenLabel = allTokens[i] ?? "?";
          const fg = intensity > 0.55 ? "var(--paper)" : "var(--ink)";
          return (
            <div
              key={i}
              title={`${tokenLabel}: ${weight.toFixed(4)}`}
              style={{
                background: bg,
                border: "1px solid var(--rule)",
                padding: "4px 6px",
                fontSize: "0.72rem",
                fontFamily: "var(--mono)",
                minWidth: 22,
                textAlign: "center",
                color: fg,
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
  return (t ?? "").replace(/\n/g, "\u21B5").replace(/ /g, "\u00B7") || "\u2205";
}