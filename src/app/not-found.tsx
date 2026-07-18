import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Page not found</h1>
        <p className="muted">That route is not available in this build.</p>
      </header>
      <section className="panel">
        <Link className="button" href="/">
          Back to Today
        </Link>
      </section>
    </div>
  );
}
