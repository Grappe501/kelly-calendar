import Link from "next/link";
import type { TodaysMissionResult } from "@/lib/missions/v21/mission-home-view-model";
import { MissionHeroCard } from "@/components/missions/MissionHeroCard";
import { MissionNextCard } from "@/components/missions/MissionNextCard";
import { MissionReadinessList } from "@/components/missions/MissionReadinessList";
import { MissionIntelligencePanel } from "@/components/missions/MissionIntelligencePanel";
import { MissionSuccessBlock } from "@/components/missions/MissionSuccessBlock";

type Props = {
  result: TodaysMissionResult;
};

function selectionHint(reason: TodaysMissionResult["selectionReason"]): string {
  switch (reason) {
    case "EXECUTING_NOW":
      return "Selected because this mission is in Execute.";
    case "TRAVEL_WINDOW":
      return "Selected because this mission is in Travel.";
    case "DEBRIEF_DUE":
      return "Selected because debrief is due.";
    case "FOLLOW_UP_DUE":
      return "Selected because follow-up is due.";
    case "PREPARING_TODAY":
      return "Selected as today’s Prepare mission.";
    case "NEXT_UPCOMING":
      return "No active mission today — showing the next upcoming mission.";
    case "NO_MISSION":
      return "No current or upcoming mission is scheduled.";
    default:
      return "";
  }
}

/**
 * V2.1 Today’s Mission operating surface.
 * One primary mission leads; calendar is secondary navigation.
 */
export function TodaysMissionSurface({ result }: Props) {
  const phaseLabel =
    result.primaryMission?.lifecyclePhaseLabel ?? "No mission";

  return (
    <div className="page-stack todays-mission">
      <header className="todays-mission-header">
        <p className="todays-mission-kicker">{result.campaignDayLabel}</p>
        <h1>Today’s Mission</h1>
        <p className="todays-mission-phase" aria-label={`Lifecycle phase: ${phaseLabel}`}>
          <span className="todays-mission-phase-label">{phaseLabel}</span>
          <span className="muted"> · Campaign day ({result.timezone})</span>
        </p>
        <p className="muted todays-mission-selection-hint">
          {selectionHint(result.selectionReason)}
        </p>
        <p className="todays-mission-header-links">
          <Link className="todays-mission-calendar-link" href="/calendar">
            Open calendar
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/missions/command-center"
          >
            Mission Command Center
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/today"
          >
            Today’s Briefing
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/launch"
          >
            Launch Today
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/movement"
          >
            Day Movement
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/logistics"
          >
            Day Logistics
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/field-ops"
          >
            Day Field Ops
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/incidents"
          >
            Day Incidents
          </Link>
          <span aria-hidden="true"> · </span>
          <Link
            className="todays-mission-calendar-link"
            href="/system/briefing/closeout"
          >
            Close Out Today
          </Link>
        </p>
      </header>

      {result.state === "EMPTY" || !result.primaryMission ? (
        <section className="panel empty-state" aria-labelledby="no-mission-heading">
          <h2 id="no-mission-heading">No active mission is scheduled.</h2>
          <p className="muted">
            The campaign day is clear. Use the calendar or mission index to plan —
            nothing is auto-created from this empty state.
          </p>
          <div className="button-row">
            <Link className="button" href="/calendar">
              Open calendar
            </Link>
            <Link className="button secondary" href="/system/missions">
              Mission index
            </Link>
            <Link className="button secondary" href="/add">
              Review event entry
            </Link>
          </div>
          {result.nextMission ? (
            <div className="todays-mission-next-wrap">
              <h3>Next mission</h3>
              <MissionNextCard mission={result.nextMission} />
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <MissionHeroCard mission={result.primaryMission} />

          <MissionSuccessBlock mission={result.primaryMission} />

          <section className="panel" aria-labelledby="readiness-heading">
            <h2 id="readiness-heading">Mission readiness</h2>
            <MissionReadinessList readiness={result.primaryMission.readiness} />
          </section>

          <section className="panel" aria-labelledby="intel-heading">
            <h2 id="intel-heading">Known intelligence</h2>
            <MissionIntelligencePanel intelligence={result.primaryMission.intelligence} />
          </section>

          <section className="panel" aria-labelledby="next-mission-heading">
            <h2 id="next-mission-heading">Next mission</h2>
            {result.nextMission ? (
              <MissionNextCard mission={result.nextMission} />
            ) : (
              <p className="muted">No later mission is queued after this one.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
