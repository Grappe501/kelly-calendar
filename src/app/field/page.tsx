import { FieldOperationsView } from "@/components/field/FieldOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateFieldOperationsAdvisory } from "@/server/services/field-operations-ai";
import { getFieldOperations } from "@/server/services/field-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function FieldOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getFieldOperations(actor);
  const advisory = await maybeGenerateFieldOperationsAdvisory({
    actor,
    field: data.field,
    enabled: params.advisory === "1",
  });

  return (
    <FieldOperationsView
      field={data.field}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
