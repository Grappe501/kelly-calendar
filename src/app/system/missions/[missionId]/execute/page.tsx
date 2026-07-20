import type { Metadata } from "next";
import { ExecuteModeWorkspace } from "@/components/missions/execute/ExecuteModeWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getExecuteWorkspace } from "@/server/services/mission-execution-service";

export const metadata: Metadata = {
  title: "Execute Mode",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function ExecuteModePage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/execute`,
  );
  const workspace = await getExecuteWorkspace(missionId, actor);

  return <ExecuteModeWorkspace initial={workspace} />;
}
