/**
 * Shows the most frequent learned BPE merges from our week-1 BPE
 * trained on a music corpus. These are NOT the model's tokens —
 * this is our parallel analysis layer.
 */
export default function BpeMergesPanel({ patterns }) {
  if (!patterns || patterns.length === 0) {
    return (
      <div>
        <h3 style={{ margin: "0 0 0.5rem" }}>Our BPE — learned musical patterns</h3>
        <p style={{ color: "var(--muted)" }}>No patterns loaded.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem" }}>Our BPE — learned musical patterns</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
        Our week-1 BPE, trained on music, discovered these as single tokens.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--muted)" }}>
            <th style={{ padding: "4px 8px" }}>Token</th>
            <th style={{ padding: "4px 8px" }}>What it represents</th>
            <th style={{ padding: "4px 8px", textAlign: "right" }}>Frequency</th>
          </tr>
        </thead>
        <tbody>
          {patterns.map((p, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "4px 8px", fontFamily: "SF Mono, monospace" }}>{p.token}</td>
              <td style={{ padding: "4px 8px" }}>{p.description}</td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: "var(--muted)" }}>
                {p.frequency}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
