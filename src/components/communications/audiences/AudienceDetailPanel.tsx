"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Detail = {
  notices: string[];
  audience: {
    id: string;
    name: string;
    audienceKey: string;
    audienceType: string;
    channelScope: string;
    status: string;
  };
  definitions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    channel: string;
    contentHash: string;
  }>;
  evaluations: Array<{
    id: string;
    evaluationType: string;
    status: string;
    includedCount: number;
    excludedCount: number;
    duplicateDestinationCount: number;
  }>;
  manifests: Array<{
    id: string;
    status: string;
    recipientCount: number;
    manifestHash: string;
  }>;
};

export function AudienceDetailPanel({ initial }: { initial: Detail }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [evalSummary, setEvalSummary] = useState<string | null>(null);

  async function refresh() {
    const next = await commJsonFetch<Detail>(
      `/api/communications/audiences/${view.audience.id}`,
      "GET",
    );
    setView(next);
  }

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D24 Audience</p>
        <h1>{view.audience.name}</h1>
        <p className="muted">
          {view.audience.audienceKey} · {view.audience.audienceType} ·{" "}
          {view.audience.channelScope} · {view.audience.status}
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Criteria builder (controlled)</h2>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const channel =
                  view.audience.channelScope === "SMS" ? "SMS" : "EMAIL";
                const def = (await commJsonFetch(
                  "/api/communications/audiences",
                  "POST",
                  {
                    audienceId: view.audience.id,
                    channel,
                    criteria: {
                      schemaVersion: "d24-1",
                      match: "ALL",
                      fabricatedPoolKey:
                        channel === "SMS" ? "sandbox_sms" : "sandbox_email_clean",
                      conditions: [
                        { key: "volunteer.active", operator: "TRUE" },
                        {
                          key:
                            channel === "SMS"
                              ? "has_valid_mobile_phone"
                              : "has_valid_email",
                          operator: "TRUE",
                        },
                        {
                          key:
                            channel === "SMS"
                              ? "has_sms_consent"
                              : "has_email_consent",
                          operator: "TRUE",
                        },
                        { key: "not_suppressed", operator: "TRUE" },
                      ],
                    },
                    changeSummary: "Sandbox active volunteers with consent",
                  },
                )) as { id: string };
                await commJsonFetch(
                  `/api/communications/audience-definitions/${def.id}`,
                  "POST",
                  { action: "submit" },
                );
                await commJsonFetch(
                  `/api/communications/audience-definitions/${def.id}`,
                  "POST",
                  { action: "approve" },
                );
                await refresh();
                setMessage("Criteria version created, submitted, and approved.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Create & approve sandbox criteria
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = (await commJsonFetch(
                  `/api/communications/audiences/${view.audience.id}`,
                  "POST",
                  { action: "evaluate", evaluationType: "PREVIEW" },
                )) as {
                  fabricatedBanner: string;
                  summary: {
                    includedCount: number;
                    excludedCount: number;
                    duplicateDestinationCount: number;
                    consentBlockedCount: number;
                    suppressedCount: number;
                  };
                };
                setEvalSummary(
                  [
                    result.fabricatedBanner,
                    `Included ${result.summary.includedCount}`,
                    `Excluded ${result.summary.excludedCount}`,
                    `Consent blocked ${result.summary.consentBlockedCount}`,
                    `Suppressed ${result.summary.suppressedCount}`,
                    `Duplicate destinations ${result.summary.duplicateDestinationCount}`,
                  ].join(" · "),
                );
                await refresh();
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Eval failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Run preview evaluation
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const evalResult = (await commJsonFetch(
                  `/api/communications/audiences/${view.audience.id}`,
                  "POST",
                  { action: "evaluate", evaluationType: "REVIEW" },
                )) as { evaluationId: string; summary: { duplicateDestinationCount: number } };
                if (evalResult.summary.duplicateDestinationCount > 0) {
                  setMessage(
                    "Duplicate destinations detected — resolve before manifest.",
                  );
                  await refresh();
                  return;
                }
                const manifest = (await commJsonFetch(
                  `/api/communications/audience-evaluations/${evalResult.evaluationId}`,
                  "POST",
                  { action: "manifest" },
                )) as { manifestId: string; manifestHash: string };
                await commJsonFetch(
                  `/api/communications/recipient-manifests/${manifest.manifestId}`,
                  "POST",
                  { action: "submit" },
                );
                await commJsonFetch(
                  `/api/communications/recipient-manifests/${manifest.manifestId}`,
                  "POST",
                  {
                    action: "approve",
                    manifestHash: manifest.manifestHash,
                  },
                );
                await refresh();
                setMessage(
                  `Manifest approved (hash ${manifest.manifestHash.slice(0, 12)}…). Production still blocked.`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Manifest failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Review → manifest → approve
          </button>
        </div>
        {evalSummary ? <p className="muted">{evalSummary}</p> : null}
      </section>

      <section className="briefing-section">
        <h2>Definitions</h2>
        <ul className="briefing-fact-list">
          {view.definitions.map((d) => (
            <li key={d.id}>
              v{d.versionNumber} · {d.status} · {d.channel} ·{" "}
              {d.contentHash.slice(0, 12)}…
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Evaluations</h2>
        <ul className="briefing-fact-list">
          {view.evaluations.map((e) => (
            <li key={e.id}>
              <Link
                href={`/system/communications/audiences/${view.audience.id}/evaluations/${e.id}`}
              >
                {e.evaluationType}
              </Link>{" "}
              · {e.status} · in {e.includedCount} / out {e.excludedCount} · dup
              dest {e.duplicateDestinationCount}
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Manifests</h2>
        <ul className="briefing-fact-list">
          {view.manifests.map((m) => (
            <li key={m.id}>
              <Link
                href={`/system/communications/audiences/${view.audience.id}/manifests/${m.id}`}
              >
                {m.status}
              </Link>{" "}
              · {m.recipientCount} recipients · {m.manifestHash.slice(0, 12)}…
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
