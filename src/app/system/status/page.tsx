import type { Metadata } from "next";
import Link from "next/link";
import { SystemStatusDashboard } from "@/components/status/system-status-dashboard";
import { runConnectionDiagnostic } from "@/lib/db/connection-diagnostic";
import { getCapabilityStatus } from "@/lib/system/capabilities";

export const metadata: Metadata = {
  title: "System status",
};

export const dynamic = "force-dynamic";

export default async function SystemStatusPage() {
  const diagnostic = await runConnectionDiagnostic();
  const status = getCapabilityStatus({
    databaseTested: diagnostic.connectionTested,
    databaseSucceeded: diagnostic.connectionSucceeded,
    databaseTargetClass: diagnostic.targetClass,
  });
  const candidateReady = status.security.candidateDataReady;

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>System status</h1>
        <p>
          {candidateReady
            ? "Steps 8–9 complete. Canonical Event is locked. Next: Step 10 calendar operating views. Communications remains frozen."
            : "Calendar foundation in progress. Complete Step 8 security closeout before entering real campaign schedule data."}
        </p>
      </header>
      <SystemStatusDashboard status={status} />
      <section className="panel">
        <h2>Calendar recovery docs</h2>
        <div className="button-row">
          <a
            className="button secondary"
            href="https://github.com/Grappe501/kelly-calendar/blob/main/develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md"
            target="_blank"
            rel="noreferrer"
          >
            Calendar roadmap
          </a>
          <a
            className="button secondary"
            href="https://github.com/Grappe501/kelly-calendar/blob/main/develop_notes/KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md"
            target="_blank"
            rel="noreferrer"
          >
            Current calendar inventory
          </a>
          <a
            className="button secondary"
            href="https://github.com/Grappe501/kelly-calendar/blob/main/develop_notes/KCCC_EA_8_SECURITY_CLOSEOUT_PLAN.md"
            target="_blank"
            rel="noreferrer"
          >
            Security closeout plan
          </a>
          <a
            className="button secondary"
            href="https://github.com/Grappe501/kelly-calendar/blob/main/develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md"
            target="_blank"
            rel="noreferrer"
          >
            Canonical Event model
          </a>
        </div>
      </section>
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/calendar">
            Calendar
          </Link>
          <Link className="button secondary" href="/system/environment">
            Environment readiness
          </Link>
          <Link className="button secondary" href="/system/security">
            Security status
          </Link>
          <Link className="button secondary" href="/system/visibility">
            Calendar visibility
          </Link>
          <Link className="button secondary" href="/more">
            Back to More
          </Link>
        </div>
      </section>
    </div>
  );
}
