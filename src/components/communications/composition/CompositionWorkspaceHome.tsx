"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type Home = {
  notices: string[];
  templates: Array<{
    id: string;
    templateKey: string;
    name: string;
    channel: string;
    status: string;
    category: string;
    versionCount: number;
    approvedVersions: number;
  }>;
  briefs: Array<{
    id: string;
    purpose: string;
    channel: string;
    status: string;
  }>;
  compositions: Array<{
    id: string;
    name: string;
    channel: string;
    approvalState: string;
    validationState: string;
    revisionNumber: number;
  }>;
  productionDispatchEnabled: boolean;
};

export function CompositionWorkspaceHome({ initial }: { initial: Home }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D23</p>
        <h1>Composition workspace</h1>
        <p className="muted">
          Draft → Preview → Approved revision → Dispatch artifact (distinct).
          Production dispatch remains blocked.
        </p>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Quick create</h2>
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch("/api/communications/templates", "POST", {
                  templateKey: `sandbox_email_${Date.now()}`,
                  name: "Email — Sandbox Test",
                  channel: "EMAIL",
                  category: "TEST_ONLY",
                });
                const next = await commJsonFetch<Home>(
                  "/api/communications/templates",
                  "GET",
                );
                setView(next);
                setMessage("Sandbox email template created (draft).");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            New sandbox email template
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await commJsonFetch("/api/communications/briefs", "POST", {
                  purpose: "Sandbox composition brief",
                  channel: "EMAIL",
                  objective: "Certify composition → artifact path",
                });
                const next = await commJsonFetch<Home>(
                  "/api/communications/briefs",
                  "GET",
                );
                setView(next);
                setMessage("Brief created.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            New brief
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Templates</h2>
        <ul className="briefing-fact-list">
          {view.templates.map((t) => (
            <li key={t.id}>
              <Link href={`/system/communications/templates/${t.id}`}>
                {t.name}
              </Link>{" "}
              · {t.templateKey} · {t.channel} · {t.status} · versions{" "}
              {t.versionCount} (approved {t.approvedVersions})
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Briefs</h2>
        <ul className="briefing-fact-list">
          {view.briefs.map((b) => (
            <li key={b.id}>
              <Link href={`/system/communications/briefs/${b.id}`}>
                {b.purpose}
              </Link>{" "}
              · {b.channel} · {b.status}
            </li>
          ))}
        </ul>
      </section>

      <section className="briefing-section">
        <h2>Compositions</h2>
        <ul className="briefing-fact-list">
          {view.compositions.map((c) => (
            <li key={c.id}>
              <Link href={`/system/communications/compositions/${c.id}`}>
                {c.name}
              </Link>{" "}
              · {c.channel} · approval {c.approvalState} · validation{" "}
              {c.validationState} · rev {c.revisionNumber}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
