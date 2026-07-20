import type { Metadata } from "next";
import Link from "next/link";
import { MobilizeConflictsWorkspace } from "@/components/integrations/MobilizeConflictsWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize publication conflicts",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MobilizeConflictsPage() {
  await requireSystemAdminPage("/system/integrations/mobilize/conflicts");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize publication conflicts</h1>
        <p>Explicit conflict resolution — no silent overwrite.</p>
      </header>
      <MobilizeConflictsWorkspace />
      <section className="panel">
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/publishing"
        >
          Publishing
        </Link>
      </section>
    </div>
  );
}
