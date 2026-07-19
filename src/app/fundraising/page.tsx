import { FundraisingOperationsView } from "@/components/fundraising/FundraisingOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateFundraisingOperationsAdvisory } from "@/server/services/fundraising-operations-ai";
import { getFundraisingOperations } from "@/server/services/fundraising-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function FundraisingOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getFundraisingOperations(actor);
  const advisory = await maybeGenerateFundraisingOperationsAdvisory({
    actor,
    fundraising: data.fundraising,
    enabled: params.advisory === "1",
  });

  return (
    <FundraisingOperationsView
      fundraising={data.fundraising}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
