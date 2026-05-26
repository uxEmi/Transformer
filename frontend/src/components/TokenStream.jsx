export default function TokenStream({
  seedTokens,
  generatedTokens,
  currentStep,
  onStepChange,
}) {
  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem" }}>Tokens</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
        Click a generated token to inspect that step.
      </p>
      <div style={{ lineHeight: 2 }}>
        {seedTokens.map((t, i) => (
          <span key={`s-${i}`} className="token-chip token-seed">
            {displayToken(t)}
          </span>
        ))}
        {generatedTokens.map((t, i) => (
          <span
            key={`g-${i}`}
            className={`token-chip token-generated ${i === currentStep ? "token-current" : ""}`}
            onClick={() => onStepChange(i)}
            style={{ cursor: "pointer" }}
          >
            {displayToken(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function displayToken(t) {
  const s = (t ?? "").replace(/\n/g, "↵").replace(/ /g, "·");
  return s || "∅";
}
