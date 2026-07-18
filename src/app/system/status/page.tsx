import type { Metadata } from "next";
import Link from "next/link";
import { StatusPanel } from "@/components/status/StatusPanel";
import { getCapabilityStatus } from "@/lib/system/capabilities";

export const metadata: Metadata = {
  title: "System status",
};

export default function SystemStatusPage() {
  const status = getCapabilityStatus({ databaseTested: false });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>System status</h1>
        <p>Safe capability indicators — no secret values are shown.</p>
      </header>

      <StatusPanel status={status} />

      <section className="panel">
        <h2>Notes</h2>
        <ul>
          <li>Authentication is not enabled (Step 4).</li>
          <li>AI calls are not enabled (Steps 16+).</li>
          <li>Database schema is not created (Step 5).</li>
          <li>
            Run <code>npm run db:diagnose</code> for a read-only connection probe.
          </li>
        </ul>
        <div className="button-row" style={{ marginTop: "1rem" }}>
          <Link className="button secondary" href="/more">
            Back to More
          </Link>
        </div>
      </section>
    </div>
  );
}
