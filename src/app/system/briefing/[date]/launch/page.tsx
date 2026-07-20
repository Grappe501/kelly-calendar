import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDayLaunchReview } from "@/components/briefing/launch/CampaignDayLaunchReview";
import {
  assertLaunchDateInRange,
} from "@/lib/missions/v21/day-launch";
import { parseBriefingDateKey } from "@/lib/missions/v21/day-briefing";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignDayLaunchReview } from "@/server/services/campaign-day-launch-review-service";

export const metadata: Metadata = {
  title: "Morning Launch Review",
  description: "Internal campaign morning launch confirmation.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function CampaignDayLaunchPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/launch`);
  if (!parseBriefingDateKey(date).ok) notFound();
  const tz = getPublicAppConfig().campaignTimezone;
  if (!assertLaunchDateInRange(date, new Date(), tz).ok) notFound();
  const actor = await requireActiveAuthenticatedActor();
  const model = await getCampaignDayLaunchReview({ dateKey: date, actor });
  return <CampaignDayLaunchReview model={model} />;
}
