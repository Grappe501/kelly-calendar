import { ComplianceOperationsView } from "@/components/compliance/ComplianceOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateComplianceOperationsAdvisory } from "@/server/services/compliance-operations-ai";
import { getComplianceOperations } from "@/server/services/compliance-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function ComplianceOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getComplianceOperations(actor);
  const advisory = await maybeGenerateComplianceOperationsAdvisory({
    actor,
    compliance: data.compliance,
    enabled: params.advisory === "1",
  });

  return (
    <ComplianceOperationsView
      compliance={data.compliance}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
