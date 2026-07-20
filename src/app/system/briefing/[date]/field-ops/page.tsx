import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayFieldOpsBoard } from "@/components/briefing/field-ops/DayFieldOpsBoard";
import { assertFieldOpsDateInRange } from "@/lib/missions/v21/field-ops";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayFieldOpsBoard } from "@/server/services/mission-field-ops-service";

export const metadata: Metadata = {
  title: "Day Field Ops Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayFieldOpsPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/field-ops`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertFieldOpsDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayFieldOpsBoard({ dateKey: date, actor });
  return <DayFieldOpsBoard model={model} />;
}
