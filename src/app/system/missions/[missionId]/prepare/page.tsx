import type { Metadata } from "next";
import { PrepareModeWorkspace } from "@/components/missions/prepare/PrepareModeWorkspace";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getPrepareWorkspace } from "@/server/services/mission-preparation-service";

export const metadata: Metadata = {
  title: "Prepare Mode",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function PrepareModePage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/prepare`,
  );
  const workspace = await getPrepareWorkspace(missionId, actor);

  return <PrepareModeWorkspace initial={workspace} />;
}
