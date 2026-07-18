import type { Metadata } from "next";
import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";

export const metadata: Metadata = { title: "Readiness engine" };
export const dynamic = "force-dynamic";

export default function ReadinessPage() {
  const empty = calculateEventReadiness({
    event: { id: "empty", version: 1 },
  });
  const festivalStart = new Date("2026-08-01T14:00:00-05:00");
  const festivalEnd = new Date("2026-08-01T17:00:00-05:00");
  const festival = calculateEventReadiness({
    event: {
      id: "festival",
      version: 1,
      eventType: "Festival Appearance",
      campaignDisplayTitle: "Pulaski County Festival",
      startsAt: festivalStart,
      endsAt: festivalEnd,
      city: "Little Rock",
      candidateRole: "Greeter",
      hostContactPresent: true,
      objectivesCount: 1,
      programFlowCount: 4,
      staffRequiredCount: 3,
      staffAssignedCount: 3,
      packingCount: 10,
      packingPackedCount: 10,
      communicationsRequiredCount: 2,
      communicationsReadyCount: 2,
      travelRequired: true,
      travelHasDriver: true,
      followupsScheduled: 1,
    },
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Event readiness engine</h1>
        <p>Explainable domain scores with critical blocker override.</p>
      </header>
      <section className="panel">
        <h2>Empty event</h2>
        <p>
          {empty.overallScore}% · {empty.readinessLevel}
        </p>
      </section>
      <section className="panel">
        <h2>Complete festival (synthetic)</h2>
        <p>
          {festival.overallScore}% · {festival.readinessLevel}
        </p>
      </section>
    </div>
  );
}
