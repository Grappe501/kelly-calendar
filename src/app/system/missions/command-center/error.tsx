"use client";

export default function MissionCommandCenterError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mission Command Center</h1>
        <p className="muted">
          The operating view could not be loaded. Mission records were not
          changed.
        </p>
        <button type="button" className="button" onClick={() => reset()}>
          Try again
        </button>
      </header>
    </div>
  );
}
