"use client";

export default function BriefingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Campaign Day Briefing</h1>
        <p className="muted">
          The briefing could not be loaded. Campaign records were not changed.
        </p>
        <button type="button" className="button" onClick={() => reset()}>
          Try again
        </button>
      </header>
    </div>
  );
}
