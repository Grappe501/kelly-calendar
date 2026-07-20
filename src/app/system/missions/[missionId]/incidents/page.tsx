import type { Metadata } from "next";
import { MissionIncidentsWorkspace } from "@/components/missions/incidents/MissionIncidentsWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionIncidentsWorkspace } from "@/server/services/mission-incident-service";

export const metadata: Metadata = {
  title: "Mission Incidents",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function MissionIncidentsPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/incidents`,
  );
  const workspace = await getMissionIncidentsWorkspace(missionId, actor);
  return <MissionIncidentsWorkspace initial={workspace} />;
}
