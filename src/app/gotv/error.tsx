"use client";

import Link from "next/link";

export default function GotvOperationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>GOTV Ops unavailable</h1>
        <p className="muted">Retry or return to County Operations.</p>
      </header>
      <div className="button-row">
        <button type="button" className="button" onClick={() => reset()}>
          Retry
        </button>
        <Link className="button secondary" href="/counties">
          County Ops
        </Link>
      </div>
    </div>
  );
}
