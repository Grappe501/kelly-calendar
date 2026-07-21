"use client";

import { useState, useTransition } from "react";
import { labelQueueStatus } from "@/lib/missions/v21/communications";
import {
  commJsonFetch,
  type CommunicationDetail,
} from "@/components/communications/shared";
import { CommunicationDetailShell } from "@/components/communications/CommunicationDetailShell";
import { DispatchPreflightPanel } from "@/components/communications/dispatch/DispatchPreflightPanel";

type Props = { initial: CommunicationDetail };

export function CommunicationQueueBoard({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handoffLabel, setHandoffLabel] = useState("");
  const [exportPreview, setExportPreview] = useState<string | null>(null);

  const base = `/api/communications/${detail.communication.id}/queue`;
  const dispatchDisabled = detail.providerCapabilities.every(
    (c) => !c.applicationEnabled,
  );

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed.");
      }
    });
  }

  const prepared = detail.queue.filter((q) => q.status === "PREPARED").length;
  const blocked = detail.queue.filter((q) => q.status === "BLOCKED").length;

  return (
    <CommunicationDetailShell detail={detail} active="queue">
      {message ? (
        <p className="panel" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="queue-status-h">
        <h2 id="queue-status-h">Queue board</h2>
        <p className="muted">
          Prepare, export, or hand off — these actions are not delivery. External
          dispatch is disabled in Kelly Calendar.
        </p>
        <ul className="briefing-fact-list">
          <li>Prepared: {prepared}</li>
          <li>Blocked: {blocked}</li>
          <li>Total queue items: {detail.queue.length}</li>
        </ul>
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                base,
                "POST",
              );
              setDetail(json.detail);
              setMessage("Queue prepared (not sent).");
            })
          }
        >
          Prepare queue
        </button>
      </section>

      <section className="panel" aria-labelledby="queue-handoff-h">
        <h2 id="queue-handoff-h">Handoff (not delivery)</h2>
        <p className="muted">
          Records a handoff label for prepared items — does not send messages.
        </p>
        <label>
          Handed off to label
          <input
            value={handoffLabel}
            onChange={(e) => setHandoffLabel(e.target.value)}
            placeholder="e.g. External mail provider workspace"
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={pending || !handoffLabel.trim()}
          onClick={() =>
            run(async () => {
              const json = await commJsonFetch<{ detail: CommunicationDetail }>(
                base,
                "PATCH",
                {
                  action: "handoff",
                  handedOffToLabel: handoffLabel.trim(),
                },
              );
              setDetail(json.detail);
              setMessage("Handoff recorded — not delivery.");
            })
          }
        >
          Record handoff (not delivery)
        </button>
      </section>

      <section className="panel" aria-labelledby="queue-export-h">
        <h2 id="queue-export-h">Export preview (not delivery)</h2>
        <p className="muted">
          Export leaves Kelly Calendar controls. Exported ≠ sent ≠ delivered.
        </p>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const json = await commJsonFetch<{
                export: { csv: string; count: number; warning: string };
              }>(base, "PATCH", { action: "export" });
              setExportPreview(json.export.csv);
              setMessage(
                `Export preview generated (${json.export.count} rows). ${json.export.warning}`,
              );
            })
          }
        >
          Export queue preview (not delivery)
        </button>
        {exportPreview ? (
          <pre className="comm-export-preview">{exportPreview}</pre>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="queue-dispatch-h">
        <h2 id="queue-dispatch-h">Provider dispatch</h2>
        <p className="muted">
          External dispatch is disabled. Preflight records gates only — not
          delivery.
        </p>
        {dispatchDisabled ? (
          <ul className="briefing-fact-list">
            {detail.providerCapabilities.map((cap) => (
              <li key={cap.capability}>
                {cap.capability}:{" "}
                {cap.applicationEnabled
                  ? "application enabled"
                  : "disabled (D21 — not delivery)"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <DispatchPreflightPanel
        communicationId={detail.communication.id}
        compact
      />

      {detail.queue.length > 0 ? (
        <section className="panel" aria-labelledby="queue-items-h">
          <h2 id="queue-items-h">Queue items (status only)</h2>
          <ul className="briefing-list">
            {detail.queue.map((q) => (
              <li key={q.id}>
                <strong>{labelQueueStatus(q.status)}</strong>
                {q.blockReasonCodes.length > 0 ? (
                  <p className="muted">
                    Blocked: {q.blockReasonCodes.join(", ")}
                  </p>
                ) : null}
                {q.handedOffToLabel ? (
                  <p className="muted">Handed off to: {q.handedOffToLabel}</p>
                ) : null}
                <p className="muted">
                  Prepared {new Date(q.preparedAt).toLocaleString()}
                  {q.exportedAt
                    ? ` · Exported ${new Date(q.exportedAt).toLocaleString()}`
                    : ""}
                  {q.handedOffAt
                    ? ` · Handed off ${new Date(q.handedOffAt).toLocaleString()}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </CommunicationDetailShell>
  );
}
