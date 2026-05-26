export default function SeedSelector({ seeds, selected, onChange }) {
  return (
    <label>
      Seed melody
      <select value={selected} onChange={(e) => onChange(e.target.value)}>
        {seeds.length === 0 && <option>Loading...</option>}
        {seeds.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.preview}
          </option>
        ))}
      </select>
    </label>
  );
}
