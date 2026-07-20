import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDayBriefing } from "@/components/briefing/day/CampaignDayBriefing";
import {
  assertBriefingDateInRange,
  parseBriefingDateKey,
} from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignDayBriefing } from "@/server/services/campaign-day-briefing-service";

export const metadata: Metadata = {
  title: "Campaign Day Briefing",
  description: "Internal campaign day operating packet.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function CampaignDayBriefingPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}`);

  const parsed = parseBriefingDateKey(date);
  if (!parsed.ok) notFound();

  const tz = getPublicAppConfig().campaignTimezone;
  const ranged = assertBriefingDateInRange(date, new Date(), tz);
  if (!ranged.ok) notFound();

  const model = await getCampaignDayBriefing({ dateKey: date });
  return <CampaignDayBriefing model={model} />;
}
