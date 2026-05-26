/**
 * Top-5 candidate tokens for a given generation step, drawn as horizontal bars.
 * Bar width = probability. The chosen token is highlighted.
 */
export default function ProbabilityBars({ step }) {
  if (!step) return null;
  const candidates = step.top_candidates || [];
  const maxProb = Math.max(...candidates.map((c) => c.prob), 0.0001);

  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem" }}>Top 5 candidates (step {step.step})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c, i) => {
          const isChosen = c.token === step.chosen_token;
          const widthPct = (c.prob / maxProb) * 100;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: "SF Mono, monospace",
                  fontSize: "0.8rem",
                  minWidth: 80,
                  color: isChosen ? "var(--accent-2)" : "var(--text)",
                }}
              >
                {displayToken(c.token)}
              </span>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 18 }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: isChosen ? "var(--accent-2)" : "var(--accent)",
                    borderRadius: 4,
                    transition: "width 0.2s",
                  }}
                />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", minWidth: 60 }}>
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
  return (t ?? "").replace(/\n/g, "↵").replace(/ /g, "·") || "∅";
}
