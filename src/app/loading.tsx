export default function Loading() {
  return (
    <div className="page-stack" role="status" aria-live="polite" aria-busy="true">
      <header className="page-header">
        <p className="muted">Kelly Campaign Command Calendar</p>
        <h1>Loading command shell…</h1>
      </header>
      <section className="panel loading-panel">
        <div className="loading-bar" />
        <p className="muted">Fetching today’s safe schedule projection.</p>
      </section>
    </div>
  );
}
