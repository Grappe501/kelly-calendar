import { CommunicationsOperationsView } from "@/components/communications/CommunicationsOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateCommunicationsOperationsAdvisory } from "@/server/services/communications-operations-ai";
import { getCommunicationsOperations } from "@/server/services/communications-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function CommunicationsOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getCommunicationsOperations(actor);
  const advisory = await maybeGenerateCommunicationsOperationsAdvisory({
    actor,
    communications: data.communications,
    enabled: params.advisory === "1",
  });

  return (
    <CommunicationsOperationsView
      communications={data.communications}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
