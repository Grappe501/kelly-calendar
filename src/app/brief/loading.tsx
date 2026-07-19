export default function CampaignBriefLoading() {
  return (
    <div className="page-stack campaign-brief" aria-busy="true">
      <header className="page-header">
        <p className="muted">Leadership scan</p>
        <h1>Today’s Campaign Brief</h1>
        <p className="muted">Loading decision-ready summary…</p>
      </header>
      <section className="panel">
        <p className="muted">Gathering missions, readiness, and conflicts.</p>
      </section>
    </div>
  );
}
