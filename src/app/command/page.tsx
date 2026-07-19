import { ExecutiveCommandView } from "@/components/command/ExecutiveCommandView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateExecutiveCommandAdvisory } from "@/server/services/executive-command-ai";
import { getExecutiveCommand } from "@/server/services/executive-command-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function ExecutiveCommandPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const data = await getExecutiveCommand(actor);
  const advisory = await maybeGenerateExecutiveCommandAdvisory({
    actor,
    command: data.command,
    enabled: params.advisory === "1",
  });

  return (
    <ExecutiveCommandView
      command={data.command}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
