import Link from "next/link";
import type { EventProvenancePanel } from "@/server/services/calendar-integrity-service";

export function EventProvenancePanelView({ data }: { data: EventProvenancePanel }) {
  return (
    <section className="panel" aria-labelledby="event-provenance-heading">
      <h2 id="event-provenance-heading">Why this Event exists</h2>
      <ul className="status-list">
        <li>
          <span>Origin</span>
          <strong>{data.origin}</strong>
        </li>
        <li>
          <span>Provider</span>
          <strong>{data.provider ?? "—"}</strong>
        </li>
        <li>
          <span>External event</span>
          <strong>{data.externalEventId ?? "—"}</strong>
        </li>
        <li>
          <span>Fingerprint</span>
          <strong>{data.fingerprint ? `${data.fingerprint.slice(0, 12)}…` : "—"}</strong>
        </li>
        <li>
          <span>Import record</span>
          <strong>{data.importRecordId ?? "—"}</strong>
        </li>
        <li>
          <span>Approval action</span>
          <strong>{data.approvalAction ?? "—"}</strong>
        </li>
        <li>
          <span>Drift</span>
          <strong>{data.drift}</strong>
        </li>
        <li>
          <span>Manually rescheduled</span>
          <strong>{data.manuallyRescheduled ? "yes" : "no"}</strong>
        </li>
        <li>
          <span>Source deleted</span>
          <strong>{data.sourceDeleted ? "yes" : "no"}</strong>
        </li>
        <li>
          <span>Legacy ingestKey</span>
          <strong>{data.ingestKey ?? "—"}</strong>
        </li>
        <li>
          <span>Mission</span>
          <strong>{data.missionId ?? "none"}</strong>
        </li>
      </ul>
      <p className="muted">
        Local protected fields (ADR-081): {data.localEditProtectedFields.join(", ")}. Provenance
        reads never mutate Events.
      </p>
      <div className="button-row">
        <Link className="button secondary" href={`/system/calendar/integrity/events/${data.eventId}`}>
          Integrity for this Event
        </Link>
        {data.importRunId ? (
          <Link className="button secondary" href="/import/google-calendar/apply">
            Import apply queue
          </Link>
        ) : null}
      </div>
    </section>
  );
}
