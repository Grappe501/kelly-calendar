import { DebateMediaOperationsView } from "@/components/debate-media/DebateMediaOperationsView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateDebateMediaOperationsAdvisory } from "@/server/services/debate-media-operations-ai";
import { getDebateMediaOperations } from "@/server/services/debate-media-operations-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function DebateMediaOperationsPage({
  searchParams,
}: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getDebateMediaOperations(actor);
  const advisory = await maybeGenerateDebateMediaOperationsAdvisory({
    actor,
    debateMedia: data.debateMedia,
    enabled: params.advisory === "1",
  });

  return (
    <DebateMediaOperationsView
      debateMedia={data.debateMedia}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
