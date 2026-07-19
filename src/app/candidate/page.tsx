import { CandidateOperationsView } from "@/components/candidate/CandidateOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateCandidateOperationsAdvisory } from "@/server/services/candidate-operations-ai";
import { getCandidateOperations } from "@/server/services/candidate-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function CandidateOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getCandidateOperations(actor);
  const advisory = await maybeGenerateCandidateOperationsAdvisory({
    actor,
    candidate: data.candidate,
    enabled: params.advisory === "1",
  });

  return (
    <CandidateOperationsView
      candidate={data.candidate}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
