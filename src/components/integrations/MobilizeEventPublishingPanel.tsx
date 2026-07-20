"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type Props = { eventId: string };

export function MobilizeEventPublishingPanel({ eventId }: Props) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [eventType, setEventType] = useState("CANVASS");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/publishing/${eventId}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load");
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  function run(action: "preview" | "approve" | "publish") {
    start(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/publishing/${eventId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, eventType, visibility }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `${action} failed`);
        if (action === "preview") setPreview(data);
        setMessage(`${action} ok`);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  function refreshRemote() {
    start(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/publishing/${eventId}/refresh`,
          { method: "POST" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Refresh failed");
        setMessage(`Refresh: ${data.state}`);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const panelStatus = String(detail?.panelStatus ?? "…");
  const publication = detail?.publication as
    | { status?: string; mappingVersion?: string; remoteFingerprint?: string }
    | null
    | undefined;
  const externalReference = detail?.externalReference as
    | { externalObjectId?: string }
    | null
    | undefined;

  return (
    <div className="stack">
      <section className="panel">
        <h2>Mobilize publication status</h2>
        <p>
          Panel: <strong>{panelStatus}</strong>
        </p>
        <ul>
          <li>Publication status: {publication?.status ?? "none"}</li>
          <li>Mapping version: {publication?.mappingVersion ?? "—"}</li>
          <li>Mobilize event id: {externalReference?.externalObjectId ?? "not linked"}</li>
        </ul>
        <p className="muted">
          Publishing never creates a Mission. Mission changes never auto-publish.
          Person/attendance writes remain disabled.
        </p>
      </section>

      <section className="panel">
        <h2>Preview / approve / publish</h2>
        <label>
          Mobilize event type
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            {[
              "CANVASS",
              "PHONE_BANK",
              "MEETING",
              "TOWN_HALL",
              "RALLY",
              "TRAINING",
              "OTHER",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visibility
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "PUBLIC" | "PRIVATE")
            }
          >
            <option value="PRIVATE">PRIVATE</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
        </label>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => run("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => run("approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => run("publish")}
          >
            Publish
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={refreshRemote}
          >
            Refresh remote
          </button>
        </div>
        {message ? <p>{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      {preview ? (
        <section className="panel">
          <h2>Last preview</h2>
          <pre className="code-block">
            {JSON.stringify(
              {
                eligible: (preview.eligibility as { eligible?: boolean })?.eligible,
                action: (preview.eligibility as { action?: string })?.action,
                issues: (preview.eligibility as { issues?: unknown })?.issues,
                privacyWarnings: (preview.mapping as { privacyWarnings?: unknown })
                  ?.privacyWarnings,
                payloadFingerprint: (preview.mapping as { payloadFingerprint?: string })
                  ?.payloadFingerprint,
                networkWriteAvailable: preview.networkWriteAvailable,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : null}

      <div className="button-row">
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/publishing"
        >
          Publishing workspace
        </Link>
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/conflicts"
        >
          Conflicts
        </Link>
        <Link
          className="button secondary"
          href={`/system/integrations/mobilize/attendance/${eventId}`}
        >
          Attendance
        </Link>
      </div>
    </div>
  );
}
