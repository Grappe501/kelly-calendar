"use client";

import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Detail = {
  notices: string[];
  composition: {
    id: string;
    name: string;
    channel: string;
    subjectDraft: string | null;
    textDraft: string | null;
    smsDraft: string | null;
    htmlDraft: string | null;
    validationState: string;
    approvalState: string;
    revisionNumber: number;
  };
  revisions: Array<{
    id: string;
    revisionNumber: number;
    contentHash: string;
    createdAt: string;
  }>;
  artifacts: Array<{
    id: string;
    renderPurpose: string;
    contentHash: string;
    invalidatedAt: string | null;
  }>;
  previewProfiles: Array<{
    key: string;
    label: string;
    fabricatedBanner: string;
  }>;
};

export function CompositionEditor({ initial }: { initial: Detail }) {
  const [view, setView] = useState(initial);
  const [subject, setSubject] = useState(initial.composition.subjectDraft ?? "");
  const [text, setText] = useState(
    initial.composition.textDraft ?? initial.composition.smsDraft ?? "",
  );
  const [profileKey, setProfileKey] = useState("standard_supporter");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const next = await commJsonFetch<Detail>(
      `/api/communications/compositions/${view.composition.id}`,
      "GET",
    );
    setView(next);
  }

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D23</p>
        <h1>{view.composition.name}</h1>
        <p className="muted">
          Approval {view.composition.approvalState} · Validation{" "}
          {view.composition.validationState} · Rev{" "}
          {view.composition.revisionNumber}
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Editor (draft)</h2>
        {view.composition.channel === "EMAIL" ? (
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
        ) : null}
        <label>
          {view.composition.channel === "SMS" ? "SMS body" : "Plain text"}
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="muted">Characters: {text.length}</p>
      </section>

      <section className="briefing-section">
        <h2>Preview profile (FABRICATED TEST DATA)</h2>
        <select
          value={profileKey}
          onChange={(e) => setProfileKey(e.target.value)}
        >
          {view.previewProfiles.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label} — {p.fabricatedBanner}
            </option>
          ))}
        </select>
      </section>

      <section className="briefing-section">
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/compositions/${view.composition.id}`,
                  "PATCH",
                  {
                    subjectDraft: subject,
                    textDraft: text,
                    smsDraft:
                      view.composition.channel === "SMS" ? text : undefined,
                    changeSummary: "operator save",
                  },
                );
                await refresh();
                setMessage("Revision saved (bounded — identical content skipped).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Save failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save revision
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = (await commJsonFetch(
                  `/api/communications/compositions/${view.composition.id}`,
                  "POST",
                  {
                    action: "render",
                    previewProfileKey: profileKey,
                    renderPurpose: "PREVIEW",
                  },
                )) as {
                  fabricatedBanner: string;
                  render: {
                    blocked: boolean;
                    subjectRendered: string | null;
                    textRendered: string | null;
                    smsRendered: string | null;
                    blockReason: string | null;
                    sms: { estimatedSegments: number } | null;
                  };
                };
                setPreview(
                  [
                    result.fabricatedBanner,
                    result.render.blocked
                      ? `BLOCKED: ${result.render.blockReason}`
                      : "OK",
                    result.render.subjectRendered,
                    result.render.textRendered ?? result.render.smsRendered,
                    result.render.sms
                      ? `Segments ~ ${result.render.sms.estimatedSegments}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                );
                await refresh();
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Render failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Validate & preview
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/compositions/${view.composition.id}`,
                  "POST",
                  { action: "submit" },
                );
                await refresh();
                setMessage("Submitted for review.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Submit failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Submit for review
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/compositions/${view.composition.id}`,
                  "POST",
                  { action: "approve" },
                );
                await refresh();
                setMessage("Approved (does not enable production dispatch).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Approve failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Approve revision
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/compositions/${view.composition.id}`,
                  "POST",
                  {
                    action: "dispatch-artifact",
                    previewProfileKey: profileKey,
                  },
                );
                await refresh();
                setMessage("Dispatch artifact created (sandbox path only).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Artifact failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Create dispatch artifact
          </button>
        </div>
      </section>

      {preview ? (
        <section className="briefing-section">
          <h2>Rendered preview</h2>
          <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {preview}
          </pre>
        </section>
      ) : null}

      <section className="briefing-section">
        <h2>Revisions</h2>
        <ul className="briefing-fact-list">
          {view.revisions.map((r) => (
            <li key={r.id}>
              rev {r.revisionNumber} · {r.contentHash.slice(0, 12)}… ·{" "}
              {r.createdAt}
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Artifacts</h2>
        <ul className="briefing-fact-list">
          {view.artifacts.map((a) => (
            <li key={a.id}>
              {a.renderPurpose} · {a.contentHash.slice(0, 12)}…
              {a.invalidatedAt ? " · invalidated" : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
