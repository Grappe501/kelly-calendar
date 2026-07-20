import type { Metadata } from "next";
import Link from "next/link";
import {
  compareLegacyEventToMission,
  MISSION_PROJECTION_VERSION,
  MISSION_V21_SEED_SOURCES,
  validateCampaignMission,
} from "@/lib/missions/v21";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "V2.1 Mission model preview",
};

export const dynamic = "force-dynamic";

export default async function SystemMissionsPage() {
  await requireSystemAdminPage("/system/missions");

  const previews = MISSION_V21_SEED_SOURCES.map((source) => {
    const comparison = compareLegacyEventToMission(source, undefined, {
      now: new Date("2026-07-20T12:00:00.000Z"),
    });
    const validation = validateCampaignMission(comparison.mission);
    return { source, comparison, validation };
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>V2.1 Mission model</h1>
        <p>
          Event → Mission projection preview ({MISSION_PROJECTION_VERSION}). Seed
          examples only — no scheduling behavior changed.
        </p>
      </header>

      <section className="panel">
        <h2>Completion gate</h2>
        <p>
          Existing Event → Mission Projection → Mission Record → Read API/UI Preview
        </p>
        <ul>
          <li>GET /api/events/[eventId]/mission — live projection + comparison</li>
          <li>POST /api/events/[eventId]/mission — persist mission record</li>
          <li>GET /api/missions/[missionId] — read persisted mission</li>
        </ul>
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
          <Link className="button secondary" href="/calendar">
            Calendar (unchanged)
          </Link>
        </div>
      </section>

      {previews.map(({ source, comparison, validation }) => (
        <section className="panel" key={source.id}>
          <h2>{comparison.mission.attendTitle}</h2>
          <p>
            Status: {comparison.mission.missionStatus} · Phase:{" "}
            {comparison.mission.lifecyclePhase} · Validation:{" "}
            {validation.ok ? "OK" : "FAILED"} (
            {validation.issues.filter((i) => i.severity === "warning").length}{" "}
            warnings)
          </p>

          <h3>Legacy event</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
            {JSON.stringify(comparison.legacyEvent, null, 2)}
          </pre>

          <h3>Mission projection</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
            {JSON.stringify(
              {
                attendTitle: comparison.mission.attendTitle,
                objective: comparison.mission.objective,
                successCriteria: comparison.mission.successCriteria,
                missionStatus: comparison.mission.missionStatus,
                lifecyclePhase: comparison.mission.lifecyclePhase,
                intelligence: comparison.mission.intelligence,
                completeness: comparison.mission.completeness,
              },
              null,
              2,
            )}
          </pre>

          <h3>Field map</h3>
          <table>
            <thead>
              <tr>
                <th>Mission field</th>
                <th>Legacy source</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {comparison.fieldMap.map((row) => (
                <tr key={row.missionField}>
                  <td>{row.missionField}</td>
                  <td>{row.legacySource}</td>
                  <td>{row.status}</td>
                  <td>{row.valueSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
