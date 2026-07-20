import type { Metadata } from "next";
import { MissionFieldOpsWorkspace } from "@/components/missions/field-ops/MissionFieldOpsWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getMissionFieldOpsWorkspace } from "@/server/services/mission-field-ops-service";

export const metadata: Metadata = {
  title: "Mission Field Ops",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function MissionFieldOpsPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/field-ops`,
  );
  const workspace = await getMissionFieldOpsWorkspace(missionId, actor);
  return <MissionFieldOpsWorkspace initial={workspace} />;
}
