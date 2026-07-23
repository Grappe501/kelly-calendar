import type { Metadata } from "next";
import Link from "next/link";
import { RedDirtIntegrationPanel } from "@/components/integrations/RedDirtIntegrationPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "RedDirt integration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RedDirtIntegrationPage() {
  await requireSystemAdminPage("/system/integrations/reddirt");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>RedDirt Read Integration</h1>
        <p>
          Server-only, read-only strategic geography. No RedDirt writes, no people
          import, no Event or Mission mutation. IC-02 (ADR-104).
        </p>
      </header>
      <RedDirtIntegrationPanel />
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/integrations">
            All integrations
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/reddirt/runs"
          >
            Runs
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/reddirt/reconciliation"
          >
            Reconciliation
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/reddirt/geography"
          >
            Strategic geography
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/reddirt/policy"
          >
            Policy
          </Link>
          <Link className="button secondary" href="/system/geography">
            IC-01 Geography
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize"
          >
            Mobilize
          </Link>
        </div>
      </section>
    </div>
  );
}
