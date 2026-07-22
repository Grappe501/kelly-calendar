import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { explainEventProvenance } from "@/server/services/calendar-integrity-service";
import { EventProvenancePanelView } from "@/components/calendar/EventProvenancePanel";
import { EventIntegrityScanButton } from "@/components/calendar/EventIntegrityScanButton";

export const metadata: Metadata = { title: "Event integrity" };
export const dynamic = "force-dynamic";

type Params = Promise<{ eventId: string }>;

export default async function EventIntegrityPage({ params }: { params: Params }) {
  const { eventId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const provenance = await explainEventProvenance(actor, eventId);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Integrity · {provenance.eventNumber}</h1>
        <p>
          Provenance is read-only. Persisted findings require an explicit scan (button below).
        </p>
      </header>
      <EventProvenancePanelView data={provenance} />
      <section className="panel">
        <h2>Event-scoped scan</h2>
        <EventIntegrityScanButton eventId={eventId} />
      </section>
      <div className="button-row">
        <Link className="button" href={`/events/${eventId}`}>
          Open Event sheet
        </Link>
        <Link className="button secondary" href="/system/calendar/integrity">
          Integrity console
        </Link>
      </div>
    </div>
  );
}
