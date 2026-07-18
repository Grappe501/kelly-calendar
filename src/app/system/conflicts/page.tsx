import type { Metadata } from "next";
import {
  assessTravelFeasibility,
  detectCandidateOverlaps,
} from "@/features/operational-intelligence/services/conflict-service";

export const metadata: Metadata = { title: "Conflict engine" };
export const dynamic = "force-dynamic";

export default function ConflictsPage() {
  const overlaps = detectCandidateOverlaps([
    {
      id: "a",
      label: "Forum",
      startsAt: new Date("2026-08-01T14:00:00"),
      endsAt: new Date("2026-08-01T16:00:00"),
      status: "CONFIRMED",
      candidateAttending: true,
    },
    {
      id: "b",
      label: "Reception",
      startsAt: new Date("2026-08-01T15:00:00"),
      endsAt: new Date("2026-08-01T17:00:00"),
      status: "CONFIRMED",
      candidateAttending: true,
    },
  ]);
  const travel = assessTravelFeasibility({
    previousEnd: new Date("2026-08-01T12:00:00"),
    nextArrivalTarget: new Date("2026-08-01T12:30:00"),
    estimatedTravelMinutes: 90,
    bufferMinutes: 15,
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Conflict & feasibility engine</h1>
        <p>Advisory only — no automatic rescheduling.</p>
      </header>
      <section className="panel">
        <h2>Candidate overlap (synthetic)</h2>
        <ul>
          {overlaps.map((c) => (
            <li key={c.id}>
              {c.severity}: {c.explanation}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Travel feasibility (synthetic)</h2>
        <p>
          {travel.feasibility}
          {travel.conflict ? ` — ${travel.conflict.explanation}` : ""}
        </p>
      </section>
    </div>
  );
}
