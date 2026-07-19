"use client";

import Link from "next/link";

export default function CampaignBriefError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Brief unavailable</h1>
        <p className="muted">
          The Campaign Brief could not load. Your session may have expired or the
          command service failed.
        </p>
      </header>
      <div className="button-row">
        <button type="button" className="button" onClick={() => reset()}>
          Retry
        </button>
        <Link className="button secondary" href="/">
          Today command
        </Link>
      </div>
    </div>
  );
}
