import type { Metadata } from "next";
import {
  isEligibleHistoricalEvidence,
  rebuildDurationPatterns,
} from "@/features/operational-intelligence/services/historical-pattern-service";

export const metadata: Metadata = { title: "Historical patterns" };
export const dynamic = "force-dynamic";

export default function PatternsPage() {
  const sources = [
    {
      id: "1",
      eventType: "Festival",
      historicalReviewStatus: "APPROVED",
      durationMinutes: 180,
    },
    {
      id: "2",
      eventType: "Festival",
      historicalReviewStatus: "APPROVED",
      durationMinutes: 150,
    },
    {
      id: "3",
      eventType: "Festival",
      historicalReviewStatus: "UNREVIEWED",
      durationMinutes: 200,
    },
  ];
  const patterns = rebuildDurationPatterns(sources);
  const eligible = sources.filter(isEligibleHistoricalEvidence).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Historical pattern engine</h1>
        <p>Reviewed evidence only. Unreviewed imports excluded.</p>
      </header>
      <section className="panel">
        <p>
          Eligible records: {eligible} / {sources.length}
        </p>
        <ul>
          {patterns.map((p) => (
            <li key={`${p.patternType}_${p.scopeKey}`}>
              {p.scopeKey}: sample {p.sampleSize}, confidence {p.confidence} —{" "}
              {p.evidenceSummary}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
