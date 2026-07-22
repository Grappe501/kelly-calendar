import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listRules } from "@/server/services/availability-service";
import { AvailabilityRulesPanel } from "@/components/calendar/availability/AvailabilityRulesPanel";

export const metadata: Metadata = {
  title: "Standing availability",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AvailabilityIndexPage() {
  const actor = await requireSystemAdminPage("/system/calendar/availability");
  const { rules } = await listRules({ actor, includeInactive: true });
  return <AvailabilityRulesPanel initialRules={rules} />;
}
