import type { Metadata } from "next";
import { EventEditorForm } from "@/components/events/EventEditorForm";
import { EventProvenancePanelView } from "@/components/calendar/EventProvenancePanel";
import { roleMayMutate } from "@/lib/auth/system-roles";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import {
  getEventAuditHistory,
  getEventEditorPayload,
} from "@/server/services/event-editor-service";
import { explainEventProvenance } from "@/server/services/calendar-integrity-service";

export const metadata: Metadata = {
  title: "Event",
};

export const dynamic = "force-dynamic";

type Params = Promise<{ eventId: string }>;

/**
 * Full event / mission sheet — open from any calendar entry.
 * Edit, cancel, archive, duplicate, and add people/prep/follow-ups live here.
 */
export default async function EventSheetPage({ params }: { params: Params }) {
  const { eventId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const editor = await getEventEditorPayload(actor, eventId);
  let history = null;
  try {
    history = await getEventAuditHistory(actor, eventId);
  } catch {
    history = null;
  }
  let provenance = null;
  try {
    provenance = await explainEventProvenance(actor, eventId);
  } catch {
    provenance = null;
  }

  return (
    <>
      <EventEditorForm
        initial={editor}
        initialHistory={history}
        canMutate={roleMayMutate(actor.primarySystemRole)}
      />
      {provenance ? <EventProvenancePanelView data={provenance} /> : null}
    </>
  );
}
