import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize attendance run",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ runId: string }> };

export default async function MobilizeAttendanceRunPage({ params }: Props) {
  const { runId } = await params;
  await requireSystemAdminPage(
    `/system/integrations/mobilize/attendance/runs/${runId}`,
  );
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Attendance sync run</h1>
        <p>Run id: {runId}</p>
      </header>
      <section className="panel">
        <p>
          Detail API:{" "}
          <code>/api/integrations/mobilize/attendance/runs/{runId}</code>
        </p>
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/attendance"
        >
          Attendance workspace
        </Link>
      </section>
    </div>
  );
}
