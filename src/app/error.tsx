"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Something went wrong</h1>
        <p className="muted">
          The request could not be completed.
          {error.digest ? ` Reference: ${error.digest}` : null}
        </p>
      </header>
      <section className="panel">
        <button className="button" type="button" onClick={() => reset()}>
          Try again
        </button>
      </section>
    </div>
  );
}
