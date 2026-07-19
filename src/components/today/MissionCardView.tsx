import Link from "next/link";
import type { MissionCard } from "@/lib/missions/mission-card";
import { MissionDayActions } from "@/components/today/MissionDayActions";

type Props = {
  mission: MissionCard;
  compact?: boolean;
  /** Set when `/calendar?event=` focuses this mission (HL-039). */
  focused?: boolean;
};

function riskClass(level: MissionCard["riskLevel"]): string {
  switch (level) {
    case "CRITICAL":
      return "mission-risk critical";
    case "HIGH":
      return "mission-risk high";
    case "WATCH":
      return "mission-risk watch";
    default:
      return "mission-risk none";
  }
}

function formatClock(iso: string | null | undefined, timeZone = "America/Chicago"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MissionCardView({ mission, compact = false, focused = false }: Props) {
  const status = mission.missionStatusPresentation;
  const timeline = mission.timeline;
  const action = mission.immediateAction;

  return (
    <article
      className={`mission-card${mission.isNext ? " mission-card-next" : ""}${compact ? " mission-card-compact" : ""}${focused ? " mission-card-focused" : ""}`}
      aria-label={`Mission: ${mission.title}`}
      data-mission-status={mission.missionStatus}
      data-mission-focused={focused ? "true" : undefined}
      id={focused ? `mission-${mission.missionId}` : undefined}
    >
      <header className="mission-card-header">
        <p className="mission-when">{mission.whenLabel}</p>
        <span className={`mission-status-badge status-${mission.missionStatus.toLowerCase()}`}>
          <span aria-hidden="true">{status.symbol}</span> {status.label}
        </span>
      </header>

      {mission.isNext ? <p className="mission-badge">Next mission</p> : null}

      <h3 className="mission-title">{mission.title}</h3>
      <p className="mission-where">{mission.whereLabel}</p>
      {!compact ? <p className="mission-why">{mission.whyItMatters}</p> : null}

      <dl className="mission-meta">
        <div>
          <dt>Owner</dt>
          <dd>{mission.ownerLabel}</dd>
        </div>
        <div>
          <dt>Readiness</dt>
          <dd data-readiness-state={mission.todayReadiness.state}>
            {mission.todayReadiness.state.replace(/_/g, " ")}
          </dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd className={riskClass(mission.riskLevel)}>
            {mission.riskLevel === "NONE" ? "Clear" : mission.riskLevel}
          </dd>
        </div>
      </dl>

      {!compact ? (
        <ul className="mission-category-strip" aria-label="Readiness categories">
          {mission.todayReadiness.categories.map((cat) => (
            <li key={cat.category} data-state={cat.state}>
              <span>{cat.category}</span>
              <strong>{cat.state.replace(/_/g, " ")}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {mission.todayReadiness.topIssue ? (
        <p className="mission-risk-note">{mission.todayReadiness.topIssue}</p>
      ) : mission.riskNote ? (
        <p className="mission-risk-note">{mission.riskNote}</p>
      ) : null}

      {!compact && timeline?.status === "computed" ? (
        <div className="mission-timeline" data-timeline-source={timeline.source}>
          <h4 className="mission-timeline-heading">Mission timeline</h4>
          <dl className="mission-timeline-grid">
            <div>
              <dt>Leave</dt>
              <dd>{formatClock(timeline.leaveByAt)}</dd>
            </div>
            <div>
              <dt>Drive</dt>
              <dd>
                {timeline.driveMinutes == null ? "—" : `${timeline.driveMinutes} min`}
              </dd>
            </div>
            <div>
              <dt>Arrive</dt>
              <dd>{formatClock(timeline.arrivalAt)}</dd>
            </div>
            <div>
              <dt>Buffer</dt>
              <dd>
                {timeline.bufferMinutes == null ? "—" : `${timeline.bufferMinutes} min`}
              </dd>
            </div>
            <div>
              <dt>Starts</dt>
              <dd>{formatClock(timeline.startsAt)}</dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>{timeline.confidence == null ? "—" : `${timeline.confidence}%`}</dd>
            </div>
          </dl>
          {timeline.recommendation ? (
            <p className="mission-timeline-reco">{timeline.recommendation}</p>
          ) : null}
          {timeline.travelRisk ? (
            <p className="mission-risk-note">{timeline.travelRisk}</p>
          ) : null}
        </div>
      ) : (
        <div className="mission-leaveby" data-leave-by-status={mission.leaveBy.status}>
          <p className="muted">
            Leave by:{" "}
            {mission.leaveBy.status === "computed" && mission.leaveBy.leaveByAt
              ? formatClock(mission.leaveBy.leaveByAt)
              : "Unavailable"}
          </p>
        </div>
      )}

      <MissionDayActions
        missionId={mission.missionId}
        eventVersion={mission.eventVersion}
        actions={mission.availableDayActions}
        canMutate={mission.canMutateDayActions}
      />

      {action.available ? (
        <Link
          className="button mission-action"
          href={action.href}
          aria-label={action.label}
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          className="button mission-action mission-action-unavailable"
          disabled
          aria-disabled="true"
          aria-label={`${action.label} unavailable`}
          title={action.unavailableReason}
        >
          {action.label}
        </button>
      )}
      {!compact || !action.available ? (
        <p className="muted mission-action-explain">
          {action.available
            ? action.explanation
            : action.unavailableReason ?? action.explanation}
        </p>
      ) : null}
    </article>
  );
}
