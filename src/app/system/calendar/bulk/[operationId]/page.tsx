"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OpPayload = {
  operation: {
    id: string;
    actionType: string;
    status: string;
    previewFingerprint: string;
    totalCount: number;
    eligibleCount: number;
    alreadyCompleteCount: number;
    ineligibleCount: number;
    reviewRequiredCount: number;
    succeededCount: number;
    skippedCount: number;
    failedCount: number;
    staleCount: number;
    truncated: boolean;
    recoveryState: string;
    reason: string | null;
    targetCalendarId: string | null;
    previewExpiresAt: string;
  };
  items: Array<{
    id: string;
    eventId: string;
    eligibility: string;
    result: string;
    missionLinked: boolean;
    isImported: boolean;
    isRecurring: boolean;
    classificationNote: string | null;
    errorClassification: string | null;
  }>;
};

export default function BulkOperationDetailPage() {
  const params = useParams<{ operationId: string }>();
  const router = useRouter();
  const operationId = params.operationId;
  const [data, setData] = useState<OpPayload | null>(null);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/calendar/bulk/${operationId}`);
    const json = await res.json();
    if (res.ok && json.ok) setData(json);
    else setError(json?.error?.publicMessage ?? "Failed to load operation.");
  }, [operationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/bulk/${operationId}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          previewFingerprint: data.operation.previewFingerprint,
          confirmationPhrase: phrase || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.publicMessage ?? "Confirm failed.");
        return;
      }
      setData(json);
    } finally {
      setBusy(false);
    }
  }

  async function recoveryPreview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/bulk/${operationId}/recovery/preview`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.publicMessage ?? "Recovery preview failed.");
        return;
      }
      router.push(`/system/calendar/bulk/${json.recoveryPreview.operation.id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="page-stack">
        <p className="muted">{error ?? "Loading…"}</p>
      </div>
    );
  }

  const op = data.operation;
  const isPreview = op.status === "PREVIEW";

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>
          Bulk {op.actionType} · {op.status}
        </h1>
        <p className="muted">
          Preview fingerprint bound · expires {op.previewExpiresAt}
          {op.truncated ? " · selection truncated to max batch size" : ""}
        </p>
      </header>

      <section className="panel">
        <dl className="week-header-stats">
          <div>
            <dt>Total</dt>
            <dd>{op.totalCount}</dd>
          </div>
          <div>
            <dt>Eligible</dt>
            <dd>{op.eligibleCount}</dd>
          </div>
          <div>
            <dt>Already done</dt>
            <dd>{op.alreadyCompleteCount}</dd>
          </div>
          <div>
            <dt>Ineligible</dt>
            <dd>{op.ineligibleCount}</dd>
          </div>
          <div>
            <dt>Needs review</dt>
            <dd>{op.reviewRequiredCount}</dd>
          </div>
          <div>
            <dt>Succeeded</dt>
            <dd>{op.succeededCount}</dd>
          </div>
          <div>
            <dt>Failed / stale</dt>
            <dd>
              {op.failedCount} / {op.staleCount}
            </dd>
          </div>
        </dl>
        {op.reason ? <p>Reason: {op.reason}</p> : null}
      </section>

      {isPreview ? (
        <section className="panel">
          <h2>Confirm execution</h2>
          <p className="muted">
            This will mutate eligible Events only through canonical services. Type{" "}
            <strong>{op.actionType}</strong> for archive/cancel.
          </p>
          {(op.actionType === "ARCHIVE" || op.actionType === "CANCEL") && (
            <label>
              Confirmation
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                aria-label="Confirmation phrase"
              />
            </label>
          )}
          <button type="button" className="button" disabled={busy} onClick={confirm}>
            {busy ? "Executing…" : "Confirm eligible items"}
          </button>
        </section>
      ) : null}

      {!isPreview && op.recoveryState === "AVAILABLE" ? (
        <section className="panel">
          <h2>Recovery</h2>
          <p className="muted">Safe inverse preview for succeeded recoverable items.</p>
          <button type="button" className="button button-secondary" disabled={busy} onClick={recoveryPreview}>
            Preview recovery
          </button>
        </section>
      ) : null}

      {error ? <p className="muted">{error}</p> : null}

      <section className="panel">
        <h2>Per-Event results</h2>
        <ul>
          {data.items.map((item) => (
            <li key={item.id}>
              <Link href={`/events/${item.eventId}`}>{item.eventId}</Link>
              {" · "}
              {item.eligibility} / {item.result}
              {item.missionLinked ? " · Mission" : ""}
              {item.isRecurring ? " · Recurring" : ""}
              {item.isImported ? " · Imported" : ""}
              {item.classificationNote ? ` — ${item.classificationNote}` : ""}
              {item.errorClassification ? ` — ${item.errorClassification}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <p>
        <Link className="chip chip-link" href="/system/calendar/bulk">
          All bulk operations
        </Link>
      </p>
    </div>
  );
}
