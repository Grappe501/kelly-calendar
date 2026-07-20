import type { Metadata } from "next";
import Link from "next/link";
import {
  compareLegacyEventToMission,
  MISSION_PROJECTION_VERSION,
  MISSION_V21_SEED_SOURCES,
  validateCampaignMission,
} from "@/lib/missions/v21";
import { labelMissionLifecyclePhase } from "@/lib/missions/v21/labels";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import {
  campaignMissionFromRow,
  listCampaignMissions,
} from "@/server/repositories/mission-repository";

export const metadata: Metadata = {
  title: "Mission index",
};

export const dynamic = "force-dynamic";

export default async function SystemMissionsPage() {
  await requireSystemAdminPage("/system/missions");

  const rows = await listCampaignMissions(100);
  const persisted = rows.map(campaignMissionFromRow);

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
        <h1>Mission index</h1>
        <p>
          Persisted V2.1 missions ({MISSION_PROJECTION_VERSION}). Home surface is
          Today’s Mission at <Link href="/">/</Link>. Cross-Mission operating
          view:{" "}
          <Link href="/system/missions/command-center">
            Mission Command Center
          </Link>
          .
        </p>
      </header>

      <section className="panel" aria-labelledby="persisted-heading">
        <h2 id="persisted-heading">Persisted missions</h2>
        {persisted.length === 0 ? (
          <p className="muted">
            No CampaignMission rows yet. Run{" "}
            <code>npm run missions:v21:backfill:apply</code> after dry-run.
          </p>
        ) : (
          <ul className="todays-mission-index-list">
            {persisted.map((mission) =>
              mission.id ? (
                <li key={mission.id}>
                  <Link href={`/system/missions/${mission.id}`}>
                    {mission.attendTitle}
                  </Link>
                  <span className="muted">
                    {" "}
                    · {labelMissionLifecyclePhase(mission.lifecyclePhase)} ·{" "}
                    {mission.missionStatus}
                  </span>
                </li>
              ) : null,
            )}
          </ul>
        )}
        <div className="button-row">
          <Link className="button" href="/">
            Today’s Mission
          </Link>
          <Link className="button secondary" href="/calendar">
            Calendar
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Seed projection previews</h2>
        <p className="muted">
          Synthetic examples for Deliverable 1 validation — not live campaign data.
        </p>
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
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
            {JSON.stringify(
              {
                attendTitle: comparison.mission.attendTitle,
                objective: comparison.mission.objective,
                successCriteria: comparison.mission.successCriteria,
                missionStatus: comparison.mission.missionStatus,
                lifecyclePhase: comparison.mission.lifecyclePhase,
                completeness: comparison.mission.completeness,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ))}
    </div>
  );
}
