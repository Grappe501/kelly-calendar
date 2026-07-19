import { VolunteerOperationsView } from "@/components/volunteers/VolunteerOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateVolunteerOperationsAdvisory } from "@/server/services/volunteer-operations-ai";
import { getVolunteerOperations } from "@/server/services/volunteer-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function VolunteerOperationsPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getVolunteerOperations(actor);
  const advisory = await maybeGenerateVolunteerOperationsAdvisory({
    actor,
    volunteers: data.volunteers,
    enabled: params.advisory === "1",
  });

  return (
    <VolunteerOperationsView
      volunteers={data.volunteers}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
