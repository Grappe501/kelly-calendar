"use client";

import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type DomainView = {
  notices: string[];
  domains: Array<{
    id: string;
    providerKey: string;
    domain: string;
    spfStatus: string;
    dkimStatus: string;
    dmarcStatus: string;
    senderVerified: boolean;
    returnPathOk: boolean;
    trackingDomainOk: boolean;
    bimiStatus: string;
    lastCheckedAt: string | null;
    nextCheckAt: string | null;
  }>;
};

export function DomainVerificationCenter({
  initial,
}: {
  initial: DomainView;
}) {
  const [view, setView] = useState(initial);
  const [providerKey, setProviderKey] = useState("resend");
  const [domain, setDomain] = useState("example.test");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D22</p>
        <h1>Domain Verification Center</h1>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Record DNS check</h2>
        <label>
          Provider
          <input
            value={providerKey}
            onChange={(e) => setProviderKey(e.target.value)}
          />
        </label>
        <label>
          Domain
          <input value={domain} onChange={(e) => setDomain(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await commJsonFetch(
                "/api/communications/providers/domains",
                "POST",
                {
                  providerKey,
                  domain,
                  spfStatus: "PENDING",
                  dkimStatus: "PENDING",
                  dmarcStatus: "PENDING",
                  senderVerified: false,
                },
              );
              const next = await commJsonFetch(
                "/api/communications/providers/domains",
                "GET",
              );
              setView(next as DomainView);
              setMessage("Domain check recorded (pending DNS validation).");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          Record check
        </button>
      </section>

      <section className="briefing-section">
        <h2>Domains</h2>
        <ul className="briefing-fact-list">
          {view.domains.map((d) => (
            <li key={d.id}>
              {d.providerKey} · {d.domain} · SPF {d.spfStatus} · DKIM{" "}
              {d.dkimStatus} · DMARC {d.dmarcStatus} · sender{" "}
              {d.senderVerified ? "yes" : "no"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
