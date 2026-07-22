import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { previewExpansion } from "@/server/services/availability-service";
import { AvailabilityPreviewPanel } from "@/components/calendar/availability/AvailabilityPreviewPanel";
import { chicagoTodayKey, shiftChicagoDateKey } from "@/lib/calendar/chicago-date";

export const metadata: Metadata = {
  title: "Availability preview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AvailabilityPreviewPage() {
  const actor = await requireSystemAdminPage("/system/calendar/availability/preview");
  const from = chicagoTodayKey();
  const to = shiftChicagoDateKey(from, 13);
  const result = await previewExpansion({
    actor,
    fromDateKey: from,
    toDateKeyInclusive: to,
  });
  return (
    <AvailabilityPreviewPanel
      initialFrom={from}
      initialTo={to}
      initialIntervals={result.intervals}
      initialTruncated={result.truncated}
    />
  );
}
