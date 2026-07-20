import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayExceptionDigest } from "@/components/briefing/exceptions/DayExceptionDigest";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { assertIncidentDateInRange } from "@/lib/missions/v21/incident-log";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayExceptionDigest } from "@/server/services/campaign-day-exception-digest-service";

export const metadata: Metadata = {
  title: "Day Exception Digest",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ date: string }> };

export default async function DayExceptionsPage({ params }: Props) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/exceptions`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertIncidentDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getDayExceptionDigest({ dateKey: date, actor });
  return <DayExceptionDigest model={model} />;
}
