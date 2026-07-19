import { LogisticsOperationsView } from "@/components/logistics/LogisticsOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateLogisticsOperationsAdvisory } from "@/server/services/logistics-operations-ai";
import { getLogisticsOperations } from "@/server/services/logistics-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function LogisticsOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getLogisticsOperations(actor);
  const advisory = await maybeGenerateLogisticsOperationsAdvisory({
    actor,
    logistics: data.logistics,
    enabled: params.advisory === "1",
  });

  return (
    <LogisticsOperationsView
      logistics={data.logistics}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
