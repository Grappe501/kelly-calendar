"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Detail = {
  notices: string[];
  campaign: {
    id: string;
    name: string;
    campaignKey: string;
    channel: string;
    campaignType: string;
    status: string;
    providerMode: string;
    timezone: string;
  };
  revisions: Array<{
    id: string;
    revisionNumber: number;
    status: string;
    contentHash: string;
  }>;
  plans: Array<{
    id: string;
    status: string;
    executionMode: string;
    maximumRecipients: number;
    maximumBatchSize: number;
  }>;
  reviews: Array<{
    id: string;
    status: string;
    readinessHash: string;
  }>;
  authorizations: Array<{
    id: string;
    decision: string;
    authorizedMode: string;
    authorizedRecipientLimit: number;
    revokedAt: string | null;
  }>;
  runs: Array<{
    id: string;
    runNumber: number;
    status: string;
    currentBatchNumber: number;
    attemptCreatedCount: number;
    preflightBlockedCount: number;
    batches: Array<{ id: string; batchNumber: number; status: string }>;
  }>;
};

export function CampaignDetailPanel({ initial }: { initial: Detail }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const next = await commJsonFetch<Detail>(
      `/api/communications/campaigns/${view.campaign.id}`,
      "GET",
    );
    setView(next);
  }

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D25 Campaign</p>
        <h1>{view.campaign.name}</h1>
        <p className="muted">
          {view.campaign.campaignKey} · {view.campaign.channel} ·{" "}
          {view.campaign.status} · {view.campaign.providerMode} ·{" "}
          {view.campaign.timezone}
        </p>
        <DispatchAdminNav />
        <p>
          <Link href="/system/communications/campaigns">← Campaigns</Link>
        </p>
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Operator controls (sandbox)</h2>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const rev = (await commJsonFetch(
                  `/api/communications/campaigns/${view.campaign.id}`,
                  "POST",
                  {
                    action: "revise",
                    executionMode: "MANUAL_SANDBOX",
                    maximumRecipients: 10,
                    maximumBatchSize: 5,
                    changeSummary: "Sandbox drill revision",
                  },
                )) as { revision: { id: string } };
                await commJsonFetch(
                  `/api/communications/campaigns/${view.campaign.id}`,
                  "POST",
                  {
                    action: "approve-revision",
                    revisionId: rev.revision.id,
                  },
                );
                await refresh();
                setMessage("Revision created and approved.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Create & approve revision
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = (await commJsonFetch(
                  `/api/communications/campaigns/${view.campaign.id}`,
                  "POST",
                  { action: "readiness" },
                )) as { status: string; readiness: { blockingIssues: string[] } };
                await refresh();
                setMessage(
                  `Readiness ${r.status}. Blocks: ${r.readiness.blockingIssues.slice(0, 4).join(", ") || "none (aside from production block)"}`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Run readiness review
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const a = (await commJsonFetch(
                  `/api/communications/campaigns/${view.campaign.id}`,
                  "POST",
                  { action: "authorize", recipientLimit: 10, batchLimit: 5 },
                )) as { authorizationHash: string; selfApproval: boolean };
                await refresh();
                setMessage(
                  `Authorize sandbox launch · hash ${a.authorizationHash.slice(0, 12)}…${a.selfApproval ? " · self-approval noted" : ""}`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Authorize sandbox launch
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const run = (await commJsonFetch(
                  `/api/communications/campaigns/${view.campaign.id}`,
                  "POST",
                  { action: "create-run" },
                )) as { runId: string };
                const batch = (await commJsonFetch(
                  `/api/communications/execution-runs/${run.runId}`,
                  "POST",
                  { action: "prepare-batch" },
                )) as { batchId: string };
                const pf = (await commJsonFetch(
                  `/api/communications/execution-batches/${batch.batchId}`,
                  "POST",
                  { action: "preflight" },
                )) as {
                  preflightBlockedCount: number;
                  sampleBlockingReasons: string[];
                };
                await commJsonFetch(
                  `/api/communications/execution-batches/${batch.batchId}`,
                  "POST",
                  { action: "dispatch" },
                );
                await refresh();
                setMessage(
                  `Batch prepared · preflight blocked ${pf.preflightBlockedCount} · dispatch blocked (sandbox). Reasons: ${pf.sampleBlockingReasons.slice(0, 3).join(", ")}`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Prepare → preflight → dispatch sandbox batch
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Revisions</h2>
        <ul className="briefing-fact-list">
          {view.revisions.map((r) => (
            <li key={r.id}>
              v{r.revisionNumber} · {r.status} · {r.contentHash.slice(0, 12)}…
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Plans / reviews / auth</h2>
        <ul className="briefing-fact-list">
          {view.plans.map((p) => (
            <li key={p.id}>
              Plan {p.executionMode} · {p.status} · max {p.maximumRecipients} / batch{" "}
              {p.maximumBatchSize}
            </li>
          ))}
          {view.reviews.map((r) => (
            <li key={r.id}>
              Review {r.status} · {r.readinessHash.slice(0, 12)}…
            </li>
          ))}
          {view.authorizations.map((a) => (
            <li key={a.id}>
              Auth {a.decision} · {a.authorizedMode} · limit{" "}
              {a.authorizedRecipientLimit}
              {a.revokedAt ? " · REVOKED" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Runs</h2>
        <ul className="briefing-fact-list">
          {view.runs.map((r) => (
            <li key={r.id}>
              Run #{r.runNumber} · {r.status} · batch {r.currentBatchNumber} ·
              attempts {r.attemptCreatedCount} · preflight blocked{" "}
              {r.preflightBlockedCount}
              <ul>
                {r.batches.map((b) => (
                  <li key={b.id}>
                    Batch {b.batchNumber} · {b.status}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
