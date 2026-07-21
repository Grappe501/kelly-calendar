"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Home = {
  notices: string[];
  audiences: Array<{
    id: string;
    audienceKey: string;
    name: string;
    audienceType: string;
    channelScope: string;
    status: string;
    definitionCount: number;
    approvedDefinitions: number;
    latestManifestStatus: string | null;
  }>;
  productionDispatchEnabled: boolean;
};

export function AudienceWorkspaceHome({ initial }: { initial: Home }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D24</p>
        <h1>Audience & recipient resolution</h1>
        <p className="muted">
          Audience proposes · Consent decides · Dispatch transports. No production
          send. No arbitrary CSV blast.
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch("/api/communications/audiences", "POST", {
                  audienceKey: `sandbox_email_${Date.now()}`,
                  name: "Sandbox Email Audience",
                  audienceType: "TEST_ONLY",
                  channelScope: "EMAIL",
                  purpose: "Sandbox recipient resolution",
                });
                const next = await commJsonFetch<Home>(
                  "/api/communications/audiences",
                  "GET",
                );
                setView(next);
                setMessage("Sandbox email audience created (draft).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            New sandbox email audience
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Audiences</h2>
        <ul className="briefing-fact-list">
          {view.audiences.map((a) => (
            <li key={a.id}>
              <Link href={`/system/communications/audiences/${a.id}`}>
                {a.name}
              </Link>{" "}
              · {a.audienceKey} · {a.audienceType} · {a.channelScope} ·{" "}
              {a.status} · defs {a.definitionCount} (approved{" "}
              {a.approvedDefinitions}) · manifest {a.latestManifestStatus ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
