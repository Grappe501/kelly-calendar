import type { Metadata } from "next";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { NewAvailabilityRuleForm } from "@/components/calendar/availability/NewAvailabilityRuleForm";

export const metadata: Metadata = {
  title: "New availability rule",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewAvailabilityRulePage() {
  await requireSystemAdminPage("/system/calendar/availability/rules/new");
  return <NewAvailabilityRuleForm />;
}
