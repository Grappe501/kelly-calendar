import Link from "next/link";
import type { TodayReadinessSummary } from "@/lib/missions/today-readiness";

type Props = {
  readiness: TodayReadinessSummary;
};

export function TodayReadinessPanel({ readiness }: Props) {
  return (
    <section className="panel today-readiness-panel" aria-labelledby="today-readiness-heading">
      <h2 id="today-readiness-heading">Today’s readiness</h2>
      <p className="muted">What could prevent today’s missions from succeeding?</p>

      <ul className="command-count-grid" aria-label="Today readiness counts">
        <li>
          <strong>{readiness.missionCount}</strong>
          <span className="muted">Missions</span>
        </li>
        <li>
          <strong>{readiness.readyCount}</strong>
          <span className="muted">Ready</span>
        </li>
        <li>
          <strong>{readiness.needsAttentionCount}</strong>
          <span className="muted">Needs attention</span>
        </li>
        <li>
          <strong>{readiness.blockedCount}</strong>
          <span className="muted">Blocked</span>
        </li>
      </ul>

      {readiness.unknownCount > 0 ? (
        <p className="muted">
          {readiness.unknownCount} mission
          {readiness.unknownCount === 1 ? "" : "s"} with Unknown readiness — not
          assumed ready.
        </p>
      ) : null}

      <div className="today-readiness-priority">
        <p>
          <span className="muted">Top issue</span>
          <br />
          <strong>{readiness.topIssue ?? "No blocking issues identified."}</strong>
        </p>
        {readiness.nextAction ? (
          <Link className="button mission-action" href={readiness.nextAction.href}>
            {readiness.nextAction.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
