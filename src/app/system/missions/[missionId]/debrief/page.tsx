import type { Metadata } from "next";
import { DebriefModeWorkspace } from "@/components/missions/debrief/DebriefModeWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getDebriefWorkspace } from "@/server/services/mission-debrief-service";

export const metadata: Metadata = {
  title: "Debrief Mode",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function DebriefModePage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/debrief`,
  );
  const workspace = await getDebriefWorkspace(missionId, actor);

  return <DebriefModeWorkspace initial={workspace} />;
}
