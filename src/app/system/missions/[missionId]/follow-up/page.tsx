import type { Metadata } from "next";
import { FollowUpModeWorkspace } from "@/components/missions/follow-up/FollowUpModeWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getFollowUpWorkspace } from "@/server/services/mission-follow-up-service";

export const metadata: Metadata = {
  title: "Follow-up Mode",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function FollowUpModePage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/follow-up`,
  );
  const workspace = await getFollowUpWorkspace(missionId, actor);

  return <FollowUpModeWorkspace initial={workspace} />;
}
