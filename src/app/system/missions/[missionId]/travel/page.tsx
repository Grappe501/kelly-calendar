import type { Metadata } from "next";
import { MissionTravelWorkspace } from "@/components/missions/travel/MissionTravelWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionTravelWorkspace } from "@/server/services/mission-travel-service";

export const metadata: Metadata = {
  title: "Mission Travel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function MissionTravelPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/travel`,
  );
  const workspace = await getMissionTravelWorkspace(missionId, actor);
  return <MissionTravelWorkspace initial={workspace} />;
}
