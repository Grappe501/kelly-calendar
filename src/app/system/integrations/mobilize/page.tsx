import type { Metadata } from "next";
import Link from "next/link";
import { MobilizeIntegrationPanel } from "@/components/integrations/MobilizeIntegrationPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize integration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MobilizeIntegrationPage() {
  await requireSystemAdminPage("/system/integrations/mobilize");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize Integration Foundation</h1>
        <p>
          Server-only connection, capability discovery, and dry-run event
          reconciliation. Outbound publishing is disabled.
        </p>
      </header>
      <MobilizeIntegrationPanel />
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/integrations">
            All integrations
          </Link>
          <Link className="button secondary" href="/system/integrations/mobilize/runs">
            Sync runs
          </Link>
          <Link className="button secondary" href="/system/missions/command-center">
            Command Center
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
