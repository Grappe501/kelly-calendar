type CapabilityStatusCardProps = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export function CapabilityStatusCard({ title, rows }: CapabilityStatusCardProps) {
  return (
    <section className="panel" aria-label={title}>
      <h2>{title}</h2>
      <ul className="status-list">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
