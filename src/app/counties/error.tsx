"use client";

import Link from "next/link";

export default function CountyOperationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>County Ops unavailable</h1>
        <p className="muted">Retry or return to Executive Command.</p>
      </header>
      <div className="button-row">
        <button type="button" className="button" onClick={() => reset()}>
          Retry
        </button>
        <Link className="button secondary" href="/command">
          Executive Command
        </Link>
      </div>
    </div>
  );
}
