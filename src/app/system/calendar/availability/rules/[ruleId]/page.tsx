import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getRule } from "@/server/services/availability-service";
import { AvailabilityRuleDetailPanel } from "@/components/calendar/availability/AvailabilityRuleDetailPanel";

export const metadata: Metadata = {
  title: "Availability rule",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ruleId: string }> };

export default async function AvailabilityRuleDetailPage({ params }: Ctx) {
  const { ruleId } = await params;
  const actor = await requireSystemAdminPage(`/system/calendar/availability/rules/${ruleId}`);
  const { rule } = await getRule({ actor, ruleId });
  return <AvailabilityRuleDetailPanel initial={rule} />;
}
