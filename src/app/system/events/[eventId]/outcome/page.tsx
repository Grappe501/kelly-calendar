import type { Metadata } from "next";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getEventOutcomeWorkspace } from "@/server/services/event-outcome-service";
import { EventOutcomeHotWashClient } from "@/components/events/EventOutcomeHotWashClient";

export const metadata: Metadata = { title: "Event outcome" };
export const dynamic = "force-dynamic";

type Params = Promise<{ eventId: string }>;

export default async function EventOutcomePage({ params }: { params: Params }) {
  const { eventId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const workspace = await getEventOutcomeWorkspace(actor, eventId);

  return (
    <EventOutcomeHotWashClient
      eventId={eventId}
      initial={workspace as never}
    />
  );
}
