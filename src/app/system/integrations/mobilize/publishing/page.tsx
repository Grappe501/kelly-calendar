import type { Metadata } from "next";
import Link from "next/link";
import { MobilizePublishingWorkspace } from "@/components/integrations/MobilizePublishingWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize publishing",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MobilizePublishingPage() {
  await requireSystemAdminPage("/system/integrations/mobilize/publishing");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize Event Publishing</h1>
        <p>
          Explicit preview, approval, and bidirectional reconciliation for
          campaign Events. Does not auto-create Missions.
        </p>
      </header>
      <MobilizePublishingWorkspace />
      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/integrations/mobilize">
            Foundation
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize/conflicts"
          >
            Conflicts
          </Link>
        </div>
      </section>
    </div>
  );
}
