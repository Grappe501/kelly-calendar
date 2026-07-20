import type { Metadata } from "next";
import Link from "next/link";
import { MobilizePersonMatchesWorkspace } from "@/components/integrations/MobilizePersonMatchesWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize person matches",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MobilizePersonMatchesPage() {
  await requireSystemAdminPage("/system/integrations/mobilize/people/matches");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize person match review</h1>
        <p>
          Conservative identity review. Confirm does not create local people in
          D18.
        </p>
      </header>
      <MobilizePersonMatchesWorkspace />
      <Link
        className="button secondary"
        href="/system/integrations/mobilize/attendance"
      >
        Attendance
      </Link>
    </div>
  );
}
