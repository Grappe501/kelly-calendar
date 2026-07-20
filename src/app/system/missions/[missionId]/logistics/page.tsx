import type { Metadata } from "next";
import { MissionLogisticsWorkspace } from "@/components/missions/logistics/MissionLogisticsWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionLogisticsWorkspace } from "@/server/services/mission-logistics-service";

export const metadata: Metadata = {
  title: "Mission Logistics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function MissionLogisticsPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/logistics`,
  );
  const workspace = await getMissionLogisticsWorkspace(missionId, actor);
  return <MissionLogisticsWorkspace initial={workspace} />;
}
