import Link from "next/link";
import type { CountyCommandNode } from "@/lib/missions/county-operations";

type Props = {
  county: CountyCommandNode;
  date: string;
  timezone: string;
};

export function CountyCommandNodeView({ county, date, timezone }: Props) {
  return (
    <div className="page-stack county-operations county-node-detail">
      <header className="page-header">
        <p className="muted">County command node</p>
        <h1>{county.countyName} County</h1>
        <p className="muted">
          {date} · {timezone}
          <br />
          {county.statusLabel}
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/counties">
            All counties
          </Link>
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
        </div>
      </header>

      <section className="panel" aria-labelledby="node-status">
        <h2 id="node-status">County status</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{county.healthScore}</strong>
            <span className="muted">Health / 100</span>
          </li>
          <li>
            <strong>{county.operationalRisk}</strong>
            <span className="muted">Operational risk</span>
          </li>
          <li>
            <strong>{county.upcomingCount}</strong>
            <span className="muted">Upcoming missions</span>
          </li>
          <li>
            <strong>{county.missionCountToday}</strong>
            <span className="muted">Missions today</span>
          </li>
        </ul>
        <p>{county.healthExplanation}</p>
      </section>

      <section className="panel" aria-labelledby="node-command">
        <h2 id="node-command">Command board</h2>
        <dl className="county-node-meta county-node-meta-wide">
          <div>
            <dt>Leader</dt>
            <dd>{county.leaderLabel}</dd>
          </div>
          <div>
            <dt>Readiness</dt>
            <dd>
              {county.readinessLabel}
              {county.readinessPercent != null ? ` · ${county.readinessPercent}%` : ""}
            </dd>
          </div>
          <div>
            <dt>Volunteer capacity</dt>
            <dd>
              {county.volunteerCapacity.status === "known"
                ? `${county.volunteerCapacity.value}% fill` +
                  (county.volunteerCapacity.openRoles != null
                    ? ` · ${county.volunteerCapacity.openRoles} open`
                    : "")
                : "Unknown"}
              <span className="muted">
                {" "}
                —{" "}
                {county.volunteerCapacity.status === "known"
                  ? county.volunteerCapacity.note
                  : county.volunteerCapacity.reason}
              </span>
            </dd>
          </div>
          <div>
            <dt>Leadership depth</dt>
            <dd className="muted">
              {county.volunteerCapacity.leadershipDepth?.status === "known"
                ? county.volunteerCapacity.leadershipDepth.note
                : (county.volunteerCapacity.leadershipDepth?.reason ??
                  "Unknown — coordinator registry not implemented")}
            </dd>
          </div>
          <div>
            <dt>Bench strength</dt>
            <dd className="muted">
              {county.volunteerCapacity.benchStrengthReason ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt>Communications support</dt>
            <dd>
              {county.communications
                ? `${county.communications.supportNeeds ?? 0} support need(s) · ${county.communications.pendingAnnouncements ?? 0} pending · risk ${county.communications.messagingRisk}`
                : "Unknown"}
              <span className="muted"> — packages Unknown</span>
            </dd>
          </div>
          <div>
            <dt>Open needs</dt>
            <dd>
              {county.openNeeds.length > 0 ? county.openNeeds.join(", ") : "None flagged"}
            </dd>
          </div>
          <div>
            <dt>Recent activity</dt>
            <dd>{county.recentActivity}</dd>
          </div>
          <div>
            <dt>Field heat</dt>
            <dd>{county.fieldHeat ?? "No field signal today"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="node-missions">
        <h2 id="node-missions">Upcoming missions</h2>
        {county.upcomingMissions.length === 0 ? (
          <p className="muted">No upcoming missions in permissioned view.</p>
        ) : (
          <ul className="county-mission-list">
            {county.upcomingMissions.map((m) => (
              <li key={m.missionId}>
                <div>
                  <strong>{m.title}</strong>
                  <p className="muted">
                    {m.whenLabel} · {m.status.replace(/_/g, " ")}
                  </p>
                </div>
                <Link className="button secondary" href={m.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="node-health">
        <h2 id="node-health">Health score factors</h2>
        <p className="muted">Deterministic and explainable — not AI.</p>
        <ul className="county-factor-list">
          {county.healthFactors.map((f) => (
            <li key={f.id}>
              <strong>
                {f.label}{" "}
                <span className="muted">
                  {f.earned}/{f.maxPoints}
                </span>
              </strong>
              <p>{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
