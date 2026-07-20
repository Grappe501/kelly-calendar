import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDayCloseout } from "@/components/briefing/closeout/CampaignDayCloseout";
import {
  assertCloseoutDateInRange,
  parseBriefingDateKey,
} from "@/lib/missions/v21/day-closeout";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignDayCloseout } from "@/server/services/campaign-day-closeout-service";

export const metadata: Metadata = {
  title: "Campaign Day Closeout",
  description: "Internal campaign day closeout and tomorrow readiness review.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

export default async function CampaignDayCloseoutPage({ params }: Ctx) {
  const { date } = await params;
  await requireSystemAdminPage(`/system/briefing/${date}/closeout`);

  const parsed = parseBriefingDateKey(date);
  if (!parsed.ok) notFound();

  const tz = getPublicAppConfig().campaignTimezone;
  const ranged = assertCloseoutDateInRange(date, new Date(), tz);
  if (!ranged.ok) notFound();

  const actor = await requireActiveAuthenticatedActor();
  const model = await getCampaignDayCloseout({ dateKey: date, actor });
  return <CampaignDayCloseout model={model} />;
}
