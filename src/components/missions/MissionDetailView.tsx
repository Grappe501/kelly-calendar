import Link from "next/link";
import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";
import { MissionIntelligencePanel } from "@/components/missions/MissionIntelligencePanel";
import { MissionReadinessList } from "@/components/missions/MissionReadinessList";
import { MissionSuccessBlock } from "@/components/missions/MissionSuccessBlock";

type Props = {
  mission: MissionHomeViewModel;
  mode: string | null;
};

const MODE_NOTES: Record<string, string> = {
  travel: "Travel Mode is forthcoming. This page is the mission record.",
  execute: "Execute Mode is forthcoming. This page is the mission record.",
  debrief: "Debrief capture is forthcoming. This page is the mission record.",
  "follow-up":
    "Follow-up task generation is forthcoming. This page is the mission record.",
};

export function MissionDetailView({ mission, mode }: Props) {
  const modeNote = mode ? MODE_NOTES[mode] ?? null : null;

  return (
    <div className="page-stack todays-mission-detail">
      <header className="page-header">
        <p className="muted">Mission record · {mission.eventNumber}</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.lifecyclePhaseLabel}
          <span aria-hidden="true"> · </span>
          {mission.operationalStatusLabel}
          {mission.isDraft ? (
            <>
              <span aria-hidden="true"> · </span>
              Draft
            </>
          ) : null}
        </p>
        <p className="muted">{mission.whenLabel}</p>
        <p className="muted">{mission.locationLabel ?? "Location unknown"}</p>
      </header>

      {modeNote ? (
        <section className="panel dev-banner" role="status">
          <p>{modeNote}</p>
        </section>
      ) : null}

      <MissionSuccessBlock mission={mission} />

      <section className="panel" aria-labelledby="detail-readiness-heading">
        <h2 id="detail-readiness-heading">Mission readiness</h2>
        <MissionReadinessList readiness={mission.readiness} />
      </section>

      <section className="panel" aria-labelledby="detail-intel-heading">
        <h2 id="detail-intel-heading">Known intelligence</h2>
        <MissionIntelligencePanel intelligence={mission.intelligence} />
      </section>

      <section className="panel" aria-labelledby="detail-meta-heading">
        <h2 id="detail-meta-heading">Projection metadata</h2>
        <dl className="todays-mission-meta">
          <div>
            <dt>Linked event</dt>
            <dd>
              {mission.eventNumber} ({mission.eventId})
            </dd>
          </div>
          <div>
            <dt>Projection version</dt>
            <dd>{mission.projectionVersion}</dd>
          </div>
          <div>
            <dt>Last projected</dt>
            <dd>{new Date(mission.projectedAt).toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Operator-owned fields</dt>
            <dd>
              {mission.operatorOwnedFields.length
                ? mission.operatorOwnedFields.join(", ")
                : "None — backfill may refresh projected fields"}
            </dd>
          </div>
          <div>
            <dt>Travel required</dt>
            <dd>{mission.travelRequired ? "Yes" : "No"}</dd>
          </div>
        </dl>
        <p className="muted">
          Lifecycle phase and operational status are distinct V2.1 fields. Legacy
          Mission Card statuses are not mapped here.
        </p>
      </section>

      <div className="button-row">
        <Link className="button" href={`/system/missions/${mission.missionId}/prepare`}>
          Open Prepare Mode
        </Link>
        <Link className="button secondary" href="/">
          Back to Today’s Mission
        </Link>
        <Link className="button secondary" href="/calendar">
          Calendar
        </Link>
        <Link
          className="button secondary"
          href={`/calendar?event=${encodeURIComponent(mission.eventId)}&view=day`}
        >
          Open linked event on calendar
        </Link>
      </div>
    </div>
  );
}
