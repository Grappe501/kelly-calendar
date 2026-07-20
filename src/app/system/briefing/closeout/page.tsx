import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Day Closeout",
  description: "Internal campaign day closeout and tomorrow readiness review.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TodaysCloseoutRedirectPage() {
  await requireSystemAdminPage("/system/briefing/closeout");
  const tz = getPublicAppConfig().campaignTimezone;
  const dateKey = campaignDateKey(new Date(), tz);
  redirect(`/system/briefing/${dateKey}/closeout`);
}
