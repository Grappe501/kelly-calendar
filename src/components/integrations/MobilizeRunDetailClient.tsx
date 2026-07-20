"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type RunDetail = {
  run: {
    id: string;
    mode: string;
    status: string;
    diagnosticSummary: string | null;
    createsProposed: number;
    conflictCount: number;
  };
  candidates: Array<{
    id: string;
    action: string;
    disposition: string;
    externalObjectId: string;
    changeSummary: string | null;
  }>;
};

export function MobilizeRunDetailClient() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/integrations/mobilize/runs/${params.runId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load run");
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  }, [params.runId]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function apply() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/runs/${params.runId}/apply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateIds: selected }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Apply failed");
        setDetail(data.detail);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Apply failed");
      }
    });
  }

  return (
    <div className="page-stack">
      <nav className="briefing-nav">
        <Link href="/system/integrations/mobilize/runs">All runs</Link>
        <Link href="/system/integrations/mobilize">Mobilize</Link>
      </nav>
      {!detail ? (
        <p className="muted">{pending ? "Loading…" : "No run loaded."}</p>
      ) : (
        <>
          <section className="panel">
            <h1>Run {detail.run.id}</h1>
            <p>
              {detail.run.mode} · {detail.run.status} · proposed creates{" "}
              {detail.run.createsProposed} · conflicts {detail.run.conflictCount}
            </p>
            {detail.run.diagnosticSummary ? (
              <p className="muted">{detail.run.diagnosticSummary}</p>
            ) : null}
          </section>
          <section className="panel">
            <h2>Candidates</h2>
            <ul>
              {detail.candidates.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggle(c.id)}
                      disabled={
                        c.disposition === "APPLIED" ||
                        !(
                          c.action === "NEW_REMOTE" ||
                          c.action === "REMOTE_CHANGED" ||
                          c.action === "REMOTE_DELETED"
                        )
                      }
                    />{" "}
                    {c.action} · {c.disposition} · {c.externalObjectId}
                    {c.changeSummary ? ` — ${c.changeSummary}` : ""}
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" onClick={apply} disabled={pending || !selected.length}>
              Apply selected (register external identities)
            </button>
          </section>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
