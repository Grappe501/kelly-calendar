import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayLogisticsBoard } from "@/components/briefing/logistics/DayLogisticsBoard";
import { assertLogisticsDateInRange } from "@/lib/missions/v21/logistics-pack";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayLogisticsBoard } from "@/server/services/mission-logistics-service";

export const metadata: Metadata = {
  title: "Day Logistics Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayLogisticsPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/logistics`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertLogisticsDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayLogisticsBoard({ dateKey: date, actor });
  return <DayLogisticsBoard model={model} />;
}
