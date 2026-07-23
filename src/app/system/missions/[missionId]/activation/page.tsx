import type { Metadata } from "next";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getActivationWorkspace } from "@/server/services/mission-activation-service";
import { MissionActivationClient } from "@/components/missions/activation/MissionActivationClient";

export const metadata: Metadata = { title: "Mission activation" };
export const dynamic = "force-dynamic";

type Params = Promise<{ missionId: string }>;

export default async function MissionActivationPage({ params }: { params: Params }) {
  const { missionId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const workspace = await getActivationWorkspace(actor, missionId);
  return (
    <MissionActivationClient missionId={missionId} initial={workspace as never} />
  );
}
