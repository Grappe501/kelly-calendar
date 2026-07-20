import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Morning Launch Review",
  description: "Internal campaign morning launch confirmation.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TodaysLaunchRedirectPage() {
  await requireSystemAdminPage("/system/briefing/launch");
  const tz = getPublicAppConfig().campaignTimezone;
  redirect(`/system/briefing/${campaignDateKey(new Date(), tz)}/launch`);
}
