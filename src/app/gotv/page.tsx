import { GotvOperationsView } from "@/components/gotv/GotvOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateGotvOperationsAdvisory } from "@/server/services/gotv-operations-ai";
import { getGotvOperations } from "@/server/services/gotv-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function GotvOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getGotvOperations(actor);
  const advisory = await maybeGenerateGotvOperationsAdvisory({
    actor,
    gotv: data.gotv,
    enabled: params.advisory === "1",
  });

  return (
    <GotvOperationsView
      gotv={data.gotv}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
