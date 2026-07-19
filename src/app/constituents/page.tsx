import { ConstituentOperationsView } from "@/components/constituents/ConstituentOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateConstituentOperationsAdvisory } from "@/server/services/constituent-operations-ai";
import { getConstituentOperations } from "@/server/services/constituent-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function ConstituentOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getConstituentOperations(actor);
  const advisory = await maybeGenerateConstituentOperationsAdvisory({
    actor,
    constituents: data.constituents,
    enabled: params.advisory === "1",
  });

  return (
    <ConstituentOperationsView
      constituents={data.constituents}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
