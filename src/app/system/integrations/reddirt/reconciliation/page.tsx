import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = { title: "RedDirt reconciliation" };
export const dynamic = "force-dynamic";

export default async function RedDirtReconciliationPage() {
  await requireSystemAdminPage("/system/integrations/reddirt/reconciliation");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>RedDirt geography reconciliation</h1>
        <p>
          IC-01 owns FIPS and place GEOIDs. Ambiguous matches require operator
          review on a run detail page before apply.
        </p>
      </header>
      <section className="panel">
        <ol>
          <li>Run a fixture or approved-export dry-run.</li>
          <li>Open the run and review ambiguous / unmatched candidates.</li>
          <li>Approve exact matches, then apply explicitly.</li>
        </ol>
      </section>
      <div className="button-row">
        <Link className="button" href="/system/integrations/reddirt/runs">
          Open runs
        </Link>
        <Link className="button secondary" href="/system/geography/reconciliation">
          IC-01 reconciliation
        </Link>
      </div>
    </div>
  );
}
