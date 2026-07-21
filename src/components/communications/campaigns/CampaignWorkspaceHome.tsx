"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Home = {
  notices: string[];
  campaigns: Array<{
    id: string;
    campaignKey: string;
    name: string;
    channel: string;
    campaignType: string;
    status: string;
    providerMode: string;
    latestRevisionStatus: string | null;
    latestRunStatus: string | null;
    authorized: boolean;
  }>;
  productionCampaignsAuthorized: number;
  productionDispatchEnabled: boolean;
};

export function CampaignWorkspaceHome({ initial }: { initial: Home }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D25</p>
        <h1>Campaigns & controlled execution</h1>
        <p className="muted">
          Campaign organizes execution. It never overrides dispatch eligibility.
          Production dispatch blocked.
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
                await commJsonFetch("/api/communications/campaigns", "POST", {
                  campaignKey: `sandbox_email_${Date.now()}`,
                  name: "Sandbox Email Campaign — Draft",
                  channel: "EMAIL",
                  campaignType: "TEST_ONLY",
                  purpose: "Manual sandbox execution drill",
                });
                const next = await commJsonFetch<Home>(
                  "/api/communications/campaigns",
                  "GET",
                );
                setView(next);
                setMessage("Sandbox email campaign created (draft).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            New sandbox email campaign
          </button>
        </div>
        <p className="muted">
          Production campaigns authorized: {view.productionCampaignsAuthorized} ·
          Production dispatch:{" "}
          {view.productionDispatchEnabled ? "ENABLED" : "BLOCKED"}
        </p>
      </section>

      <section className="briefing-section">
        <h2>Campaigns</h2>
        <ul className="briefing-fact-list">
          {view.campaigns.map((c) => (
            <li key={c.id}>
              <Link href={`/system/communications/campaigns/${c.id}`}>
                {c.name}
              </Link>{" "}
              · {c.campaignKey} · {c.channel} · {c.status} · rev{" "}
              {c.latestRevisionStatus ?? "—"} · run {c.latestRunStatus ?? "—"} ·
              auth {c.authorized ? "yes" : "no"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
