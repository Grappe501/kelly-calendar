"use client";

import { useState, useTransition } from "react";

export function RedDirtRunApplyPanel({
  runId,
  candidateIds,
}: {
  runId: string;
  candidateIds: string[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/integrations/reddirt/runs/${runId}/apply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateIds }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Apply failed");
        setMessage(
          `Applied: created ${data.created}, duplicates ${data.duplicates}, skipped ${data.skipped}`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Apply failed");
      }
    });
  }

  return (
    <section className="panel">
      <h2>Apply approved / pending exact matches</h2>
      <p>
        Explicit apply only. Reapplying the same fingerprint creates zero
        duplicates. Never mutates Events or Missions.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <button
        type="button"
        className="button"
        onClick={apply}
        disabled={pending || candidateIds.length === 0}
      >
        Apply {candidateIds.length} candidate(s)
      </button>
    </section>
  );
}
