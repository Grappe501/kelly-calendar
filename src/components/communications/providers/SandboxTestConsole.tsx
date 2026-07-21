"use client";

import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type ConsoleView = {
  notices: string[];
  providers: Array<{
    providerKey: string;
    displayName: string;
    isSandboxOnly: boolean;
  }>;
  recentTests: Array<{
    id: string;
    providerKey: string;
    status: string;
    recipientMasked: string | null;
    subject: string | null;
    latencyMs: number | null;
    createdAt: string;
  }>;
  recentCertifications: Array<{
    id: string;
    providerKey: string;
    status: string;
    passedCount: number;
    failedCount: number;
    createdAt: string;
  }>;
};

export function SandboxTestConsole({ initial }: { initial: ConsoleView }) {
  const [view, setView] = useState(initial);
  const [providerKey, setProviderKey] = useState("kccc-sandbox");
  const [recipient, setRecipient] = useState("sandbox@example.test");
  const [subject, setSubject] = useState("D22 sandbox test");
  const [message, setMessage] = useState("Sandbox certification message.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function refresh() {
    const next = await commJsonFetch(
      "/api/communications/providers/sandbox/console",
      "GET",
    );
    setView(next as ConsoleView);
  }

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D22</p>
        <h1>Sandbox Test Console</h1>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {result ? <p className="muted">{result}</p> : null}

      <section className="briefing-section">
        <h2>Dispatch (sandbox only)</h2>
        <label>
          Provider
          <select
            value={providerKey}
            onChange={(e) => setProviderKey(e.target.value)}
          >
            {view.providers.map((p) => (
              <option key={p.providerKey} value={p.providerKey}>
                {p.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recipient
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </label>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label>
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </label>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await commJsonFetch(
                  "/api/communications/providers/sandbox/console",
                  "POST",
                  {
                    providerKey,
                    recipient,
                    subject,
                    message,
                    simulateOnly: true,
                  },
                );
                setResult(`Simulation ${(r as { status: string }).status}`);
                await refresh();
              } catch (e) {
                setResult(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Simulate
          </button>
          <button
            type="button"
            disabled={busy || providerKey !== "kccc-sandbox"}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await commJsonFetch(
                  "/api/communications/providers/sandbox/console",
                  "POST",
                  {
                    providerKey,
                    recipient,
                    subject,
                    message,
                    simulateOnly: false,
                  },
                );
                setResult(
                  `Dispatch ${(r as { status: string }).status} · ${(r as { latencyMs?: number }).latencyMs ?? "—"}ms`,
                );
                await refresh();
              } catch (e) {
                setResult(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Dispatch sandbox
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Recent tests</h2>
        <ul className="briefing-fact-list">
          {view.recentTests.map((t) => (
            <li key={t.id}>
              {t.createdAt} · {t.providerKey} · {t.status} ·{" "}
              {t.recipientMasked} · {t.latencyMs ?? "—"}ms
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Recent certifications</h2>
        <ul className="briefing-fact-list">
          {view.recentCertifications.map((c) => (
            <li key={c.id}>
              {c.createdAt} · {c.providerKey} · {c.status} · {c.passedCount}/
              {c.passedCount + c.failedCount}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
