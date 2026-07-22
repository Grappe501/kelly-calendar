import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listExceptions } from "@/server/services/availability-service";
import { AvailabilityExceptionsPanel } from "@/components/calendar/availability/AvailabilityExceptionsPanel";

export const metadata: Metadata = {
  title: "Availability exceptions",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AvailabilityExceptionsPage() {
  const actor = await requireSystemAdminPage("/system/calendar/availability/exceptions");
  const { exceptions } = await listExceptions({ actor, includeInactive: true });
  return <AvailabilityExceptionsPanel initialExceptions={exceptions} />;
}
