export default function ProbabilityBars({ step }) {
  if (!step) return null;
  const candidates = step.top_candidates || [];
  const maxProb = Math.max(...candidates.map((c) => c.prob), 0.0001);

  return (
    <div>
      <h3>Top 5 candidates &mdash; step {step.step}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map((c, i) => {
          const isChosen = c.token === step.chosen_token;
          const widthPct = (c.prob / maxProb) * 100;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.78rem",
                  minWidth: 90,
                  color: isChosen ? "var(--oxblood)" : "var(--ink-soft)",
                  fontWeight: isChosen ? 600 : 400,
                }}
              >
                {displayToken(c.token)}
              </span>
              <div style={{ flex: 1, background: "var(--paper-deep)", height: 14, border: "1px solid var(--rule)" }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: isChosen ? "var(--oxblood)" : "var(--mustard)",
                    transition: "width 0.25s",
                  }}
                />
              </div>
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "0.95rem", color: isChosen ? "var(--oxblood)" : "var(--ink-soft)", minWidth: 60, textAlign: "right" }}>
                {(c.prob * 100).toFixed(1)}%
              </span>
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