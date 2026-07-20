import type { Metadata } from "next";
import Link from "next/link";
import { MobilizeAttendanceEventPanel } from "@/components/integrations/MobilizeAttendanceEventPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize event attendance",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function MobilizeAttendanceEventPage({ params }: Props) {
  const { eventId } = await params;
  await requireSystemAdminPage(
    `/system/integrations/mobilize/attendance/${eventId}`,
  );
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Event attendance aggregates</h1>
        <p>Local Event id: {eventId}</p>
      </header>
      <MobilizeAttendanceEventPanel eventId={eventId} />
      <Link
        className="button secondary"
        href="/system/integrations/mobilize/attendance"
      >
        Attendance workspace
      </Link>
    </div>
  );
}
