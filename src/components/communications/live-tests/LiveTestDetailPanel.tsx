"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Detail = {
  notices: string[];
  program: {
    id: string;
    name: string;
    programKey: string;
    channel: string;
    providerState: string;
    status: string;
  };
  revisions: Array<{ id: string; revisionNumber: number; status: string }>;
  recipients: Array<{
    id: string;
    status: string;
    destinationMasked: string;
  }>;
  reviews: Array<{ id: string; status: string; readinessHash: string }>;
  authorizations: Array<{
    id: string;
    status: string;
    authorizationHash: string;
    authorizedEndAt: string | null;
  }>;
  executions: Array<{
    id: string;
    status: string;
    safetyOk: boolean | null;
    evidenceFinalState: string | null;
  }>;
  phrases: { authorize: string; launch: string };
};

export function LiveTestDetailPanel({ initial }: { initial: Detail }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authPhrase, setAuthPhrase] = useState("");
  const [launchPhrase, setLaunchPhrase] = useState("");

  async function refresh() {
    const next = await commJsonFetch<Detail>(
      `/api/communications/live-tests/${view.program.id}`,
      "GET",
    );
    setView(next);
  }

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D26 Controlled live test</p>
        <h1>{view.program.name}</h1>
        <p className="muted">
          {view.program.programKey} · {view.program.channel} ·{" "}
          {view.program.status} · provider {view.program.providerState}
        </p>
        <DispatchAdminNav />
        <p>
          <Link href="/system/communications/live-tests">← Live tests</Link>
        </p>
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Prepare (not campaign send)</h2>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  { action: "add-recipient", destinationHint: "ops@example.test" },
                );
                await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  { action: "revise" },
                );
                await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  { action: "verify" },
                );
                const r = (await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  { action: "readiness" },
                )) as { status: string };
                await refresh();
                setMessage(`Prepared · readiness ${r.status}`);
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Recipient → revision → verify → readiness
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  { action: "emergency-stop", reason: "Operator stop" },
                );
                await refresh();
                setMessage("Emergency stop — auth revoked, provider sandbox-only.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Emergency stop
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Authorize one live test</h2>
        <p className="muted">
          Type exactly: <code>{view.phrases.authorize}</code>
        </p>
        <input
          value={authPhrase}
          onChange={(e) => setAuthPhrase(e.target.value)}
          aria-label="Authorization confirmation phrase"
          style={{ width: "100%", maxWidth: 420 }}
        />
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const a = (await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  {
                    action: "authorize",
                    typedConfirmation: authPhrase,
                  },
                )) as { authorizationHash: string; notice: string };
                await refresh();
                setMessage(a.notice);
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Authorize one live test
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Send one controlled test</h2>
        <p className="muted">
          One real recipient · one artifact · no retry · no schedule · no
          audience. Type exactly: <code>{view.phrases.launch}</code>
        </p>
        <input
          value={launchPhrase}
          onChange={(e) => setLaunchPhrase(e.target.value)}
          aria-label="Launch confirmation phrase"
          style={{ width: "100%", maxWidth: 420 }}
        />
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const auth = view.authorizations.find(
                  (a) => a.status === "AUTHORIZED",
                );
                if (!auth) throw new Error("No active authorization");
                const result = (await commJsonFetch(
                  `/api/communications/live-tests/${view.program.id}`,
                  "POST",
                  {
                    action: "launch",
                    typedConfirmation: launchPhrase,
                    authorizationId: auth.id,
                    authorizationHash: auth.authorizationHash,
                  },
                )) as {
                  status: string;
                  providerRequests: number;
                  authorizationConsumed: boolean;
                  notice: string;
                  executionId: string;
                };
                if (result.executionId) {
                  await commJsonFetch(
                    `/api/communications/live-tests/${view.program.id}`,
                    "POST",
                    {
                      action: "complete-review",
                      executionId: result.executionId,
                    },
                  );
                }
                await refresh();
                setMessage(
                  `${result.notice} · status ${result.status} · consumed ${result.authorizationConsumed} · provider requests ${result.providerRequests}`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Send one controlled test
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>State</h2>
        <ul className="briefing-fact-list">
          {view.recipients.map((r) => (
            <li key={r.id}>
              Recipient {r.status} · {r.destinationMasked}
            </li>
          ))}
          {view.reviews.map((r) => (
            <li key={r.id}>
              Review {r.status} · {r.readinessHash.slice(0, 12)}…
            </li>
          ))}
          {view.authorizations.map((a) => (
            <li key={a.id}>
              Auth {a.status} · expires {a.authorizedEndAt ?? "—"}
            </li>
          ))}
          {view.executions.map((e) => (
            <li key={e.id}>
              Execution {e.status} · evidence {e.evidenceFinalState ?? "—"} ·
              safety {e.safetyOk == null ? "—" : e.safetyOk ? "ok" : "FAILED"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
