"use client";

export default function LaunchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <h1>Morning Launch Review unavailable</h1>
      <p className="muted">{error.message || "Something went wrong."}</p>
      <button type="button" className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
