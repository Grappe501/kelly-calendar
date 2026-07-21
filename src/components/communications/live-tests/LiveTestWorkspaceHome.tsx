"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Home = {
  notices: string[];
  programs: Array<{
    id: string;
    programKey: string;
    name: string;
    channel: string;
    providerState: string;
    status: string;
    approvedRecipients: number;
    activeAuthorization: boolean;
  }>;
  counts: {
    approvedLiveTestRecipients: number;
    activeLiveTestAuthorizations: number;
    generalProductionDispatchEnabled: boolean;
  };
};

export function LiveTestWorkspaceHome({ initial }: { initial: Home }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D26</p>
        <h1>Controlled live tests</h1>
        <p className="muted">
          One-time real-world verification — not production campaign sending.
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <ul className="briefing-fact-list">
          <li>
            Approved recipients: {view.counts.approvedLiveTestRecipients}
          </li>
          <li>
            Active authorizations: {view.counts.activeLiveTestAuthorizations}
          </li>
          <li>
            General production dispatch:{" "}
            {view.counts.generalProductionDispatchEnabled
              ? "ENABLED"
              : "BLOCKED"}
          </li>
        </ul>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch("/api/communications/live-tests", "POST", {
                  programKey: `controlled_email_${Date.now()}`,
                  name: "Controlled Email Live Test — Draft",
                  channel: "EMAIL",
                  purpose: "Infrastructure verification only",
                });
                const next = await commJsonFetch<Home>(
                  "/api/communications/live-tests",
                  "GET",
                );
                setView(next);
                setMessage("Draft live-test program created.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            New controlled email live test
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Programs</h2>
        <ul className="briefing-fact-list">
          {view.programs.map((p) => (
            <li key={p.id}>
              <Link href={`/system/communications/live-tests/${p.id}`}>
                {p.name}
              </Link>{" "}
              · {p.channel} · {p.status} · provider {p.providerState} ·
              recipients {p.approvedRecipients} · auth{" "}
              {p.activeAuthorization ? "active" : "none"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
