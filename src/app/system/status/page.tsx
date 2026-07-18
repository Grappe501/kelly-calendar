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

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>System status</h1>
        <p>
          The environment and security foundation is active, but authentication and calendar
          data protections are not complete. Do not enter real candidate schedule information.
        </p>
      </header>
      <SystemStatusDashboard status={status} />
      <section className="panel">
        <div className="button-row">
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
