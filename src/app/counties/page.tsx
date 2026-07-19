import { CountyOperationsView } from "@/components/counties/CountyOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateCountyOperationsAdvisory } from "@/server/services/county-operations-ai";
import { getCountyOperations } from "@/server/services/county-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function CountyOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getCountyOperations(actor);
  const advisory = await maybeGenerateCountyOperationsAdvisory({
    actor,
    counties: data.counties,
    enabled: params.advisory === "1",
  });

  return (
    <CountyOperationsView
      counties={data.counties}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
