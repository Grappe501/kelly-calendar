import { PetitionBallotOperationsView } from "@/components/petition/PetitionBallotOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGeneratePetitionBallotOperationsAdvisory } from "@/server/services/petition-ballot-operations-ai";
import { getPetitionBallotOperations } from "@/server/services/petition-ballot-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function PetitionBallotOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getPetitionBallotOperations(actor);
  const advisory = await maybeGeneratePetitionBallotOperationsAdvisory({
    actor,
    petition: data.petition,
    enabled: params.advisory === "1",
  });

  return (
    <PetitionBallotOperationsView
      petition={data.petition}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
