import Link from "next/link";
import type { MissionCard } from "@/lib/missions/mission-card";

type Props = {
  mission: MissionCard;
  compact?: boolean;
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

export function MissionCardView({ mission, compact = false }: Props) {
  return (
    <article
      className={`mission-card${mission.isNext ? " mission-card-next" : ""}${compact ? " mission-card-compact" : ""}`}
      aria-label={`Mission: ${mission.title}`}
    >
      <header className="mission-card-header">
        <p className="mission-when">{mission.whenLabel}</p>
        {mission.isNext ? <span className="mission-badge">Next mission</span> : null}
      </header>

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
          <dd>{mission.readinessLabel}</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd className={riskClass(mission.riskLevel)}>
            {mission.riskLevel === "NONE" ? "Clear" : mission.riskLevel}
          </dd>
        </div>
      </dl>

      {mission.riskNote ? <p className="mission-risk-note">{mission.riskNote}</p> : null}

      <div className="mission-leaveby" data-leave-by-status={mission.leaveBy.status}>
        <p className="muted">
          Leave by:{" "}
          {mission.leaveBy.status === "computed" && mission.leaveBy.leaveByAt
            ? new Date(mission.leaveBy.leaveByAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : "Coming in 6.3"}
        </p>
      </div>

      <Link
        className="button mission-action"
        href={mission.immediateAction.href}
        aria-label={mission.immediateAction.label}
      >
        {mission.immediateAction.label}
      </Link>
      {!compact ? (
        <p className="muted mission-action-explain">{mission.immediateAction.explanation}</p>
      ) : null}
    </article>
  );
}
