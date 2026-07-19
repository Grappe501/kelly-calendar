"use client";

import Link from "next/link";

export default function ExecutiveCommandError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Command unavailable</h1>
        <p className="muted">
          Executive Command could not load. Retry or use Today / Brief.
        </p>
      </header>
      <div className="button-row">
        <button type="button" className="button" onClick={() => reset()}>
          Retry
        </button>
        <Link className="button secondary" href="/">
          Today
        </Link>
        <Link className="button secondary" href="/brief">
          Campaign Brief
        </Link>
      </div>
    </div>
  );
}
