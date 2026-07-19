import { FinanceOperationsView } from "@/components/finance/FinanceOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateFinanceOperationsAdvisory } from "@/server/services/finance-operations-ai";
import { getFinanceOperations } from "@/server/services/finance-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function FinanceOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getFinanceOperations(actor);
  const advisory = await maybeGenerateFinanceOperationsAdvisory({
    actor,
    finance: data.finance,
    enabled: params.advisory === "1",
  });

  return (
    <FinanceOperationsView
      finance={data.finance}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
