import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayMovementBoard } from "@/components/briefing/movement/DayMovementBoard";
import { assertMovementDateInRange } from "@/lib/missions/v21/travel-movement";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayMovementBoard } from "@/server/services/mission-travel-service";

export const metadata: Metadata = {
  title: "Day Movement Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayMovementPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/movement`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertMovementDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayMovementBoard({ dateKey: date, actor });
  return <DayMovementBoard model={model} />;
}
