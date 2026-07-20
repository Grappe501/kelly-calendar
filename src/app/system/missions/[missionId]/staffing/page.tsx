import type { Metadata } from "next";
import { MissionStaffingWorkspace } from "@/components/missions/staffing/MissionStaffingWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionStaffingWorkspace } from "@/server/services/mission-staffing-service";

export const metadata: Metadata = {
  title: "Mission Staffing",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function MissionStaffingPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/staffing`,
  );
  const workspace = await getMissionStaffingWorkspace(missionId, actor);
  return <MissionStaffingWorkspace initial={workspace} />;
}
