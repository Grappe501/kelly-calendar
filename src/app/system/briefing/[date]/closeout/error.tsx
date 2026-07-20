"use client";

export default function CloseoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <h1>Day Closeout unavailable</h1>
      <p className="muted">{error.message || "Something went wrong."}</p>
      <button type="button" className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
