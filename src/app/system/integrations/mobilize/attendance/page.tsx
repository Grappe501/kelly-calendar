import type { Metadata } from "next";
import Link from "next/link";
import { MobilizeAttendanceWorkspace } from "@/components/integrations/MobilizeAttendanceWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize attendance",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MobilizeAttendancePage() {
  await requireSystemAdminPage("/system/integrations/mobilize/attendance");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize Signup & Attendance (read)</h1>
        <p>
          Privacy-scoped aggregates, dry-run sync, and explicit check-in
          correlation. Person-level apply disabled.
        </p>
      </header>
      <MobilizeAttendanceWorkspace />
      <section className="panel">
        <Link className="button secondary" href="/system/integrations/mobilize">
          Foundation
        </Link>
      </section>
    </div>
  );
}
