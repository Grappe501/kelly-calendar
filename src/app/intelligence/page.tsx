import { IntelligenceOperationsView } from "@/components/intelligence/IntelligenceOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateIntelligenceOperationsAdvisory } from "@/server/services/intelligence-operations-ai";
import { getOperationalIntelligence } from "@/server/services/intelligence-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function IntelligenceOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getOperationalIntelligence(actor);
  const advisory = await maybeGenerateIntelligenceOperationsAdvisory({
    actor,
    intelligence: data.intelligence,
    enabled: params.advisory === "1",
  });

  return (
    <IntelligenceOperationsView
      intelligence={data.intelligence}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
