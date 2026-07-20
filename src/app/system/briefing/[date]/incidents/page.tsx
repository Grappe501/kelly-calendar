import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayIncidentBoard } from "@/components/briefing/incidents/DayIncidentBoard";
import { assertIncidentDateInRange } from "@/lib/missions/v21/incident-log";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayIncidentBoard } from "@/server/services/mission-incident-service";

export const metadata: Metadata = {
  title: "Day Incident Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function DayIncidentsPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/incidents`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertIncidentDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayIncidentBoard({ dateKey: date, actor });
  return <DayIncidentBoard model={model} />;
}
