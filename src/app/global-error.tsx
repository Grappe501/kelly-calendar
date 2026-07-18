"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h1>Application error</h1>
          <p>The request could not be completed.</p>
          {error.digest ? <p>Reference: {error.digest}</p> : null}
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
