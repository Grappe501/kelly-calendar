import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayStaffingBoard } from "@/components/briefing/staffing/DayStaffingBoard";
import { assertBriefingDateInRange } from "@/lib/missions/v21/day-briefing";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { buildDayStaffingBoardView } from "@/lib/missions/v21/staffing/build-view-model";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayStaffingBoard } from "@/server/services/mission-staffing-service";

export const metadata: Metadata = {
  title: "Day Staffing Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayStaffingPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/staffing`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  const now = new Date();
  if (!assertBriefingDateInRange(date, now, tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const board = await getDayStaffingBoard(date, actor, now);
  const model = buildDayStaffingBoardView(board, now);
  return <DayStaffingBoard model={model} />;
}
