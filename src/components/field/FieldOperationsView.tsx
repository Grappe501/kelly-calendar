import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import { FieldCheckIns } from "@/components/field/FieldCheckIns";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  field: FieldOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function FieldOperationsView({
  field,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack field-operations">
      <header className="page-header">
        <p className="muted">Who needs help right now?</p>
        <h1>Field Operations</h1>
        <p className="muted">
          {field.date} · {field.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="field-home">
        <h2 id="field-home">Field snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{field.activeMissions}</strong>
            <span className="muted">Active missions</span>
          </li>
          <li>
            <strong>{field.teamsInField}</strong>
            <span className="muted">Teams in field</span>
          </li>
          <li>
            <strong>{field.needAttention}</strong>
            <span className="muted">Need attention</span>
          </li>
          <li>
            <strong>{field.blocked}</strong>
            <span className="muted">Blocked</span>
          </li>
          <li>
            <strong>{field.unassigned}</strong>
            <span className="muted">Unassigned / understaffed</span>
          </li>
        </ul>
        {field.nextEscalation ? (
          <div className="brief-blocker" data-priority="HIGH">
            <p className="brief-blocker-message">
              Next escalation: {field.nextEscalation.countyLabel} —{" "}
              {field.nextEscalation.detail}
            </p>
            {field.nextEscalation.href ? (
              <Link className="button" href={field.nextEscalation.href}>
                Open mission
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="muted">No escalations queued.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="field-help">
        <h2 id="field-help">Who needs help?</h2>
        {field.helpQueue.length === 0 ? (
          <p className="muted">No field missions in permissioned view.</p>
        ) : (
          <ul className="field-help-queue">
            {field.helpQueue.map((item) => (
              <li key={item.id} data-severity={item.severity}>
                <div>
                  <strong>
                    {item.countyLabel}{" "}
                    <span className="muted">· {item.severity}</span>
                  </strong>
                  <p>{item.detail}</p>
                </div>
                <Link className="button secondary" href={item.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="field-heat">
        <h2 id="field-heat">Operational heat</h2>
        {field.operationalHeat.length === 0 ? (
          <p className="muted">No county heat for today.</p>
        ) : (
          <ul className="field-heat-list">
            {field.operationalHeat.map((row) => (
              <li key={row.countyName} data-heat={row.heat}>
                <strong>{row.countyName}</strong>
                <span>
                  {row.heat.replace(/_/g, " ")} · {row.missionCount} mission(s)
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Stress by county from mission readiness — not turnout analytics.
        </p>
      </section>

      <section className="panel" aria-labelledby="field-teams">
        <h2 id="field-teams">Team cards</h2>
        {field.teamCards.length === 0 ? (
          <div className="empty-state">
            <strong>No active field teams today.</strong>
            <p className="muted">Completed or empty day in this permissioned view.</p>
          </div>
        ) : (
          <ul className="field-team-list">
            {field.teamCards.map((team) => (
              <li key={team.teamId} className="field-team-card" data-heat={team.heat}>
                <header>
                  <h3>{team.teamLabel}</h3>
                  <span>{team.statusLabel}</span>
                </header>
                <dl className="brief-kv">
                  <div>
                    <dt>Mission</dt>
                    <dd>{team.missionTitle}</dd>
                  </div>
                  <div>
                    <dt>Leader</dt>
                    <dd>{team.leaderLabel}</dd>
                  </div>
                  <div>
                    <dt>Backup</dt>
                    <dd>{team.backupLabel ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>Readiness</dt>
                    <dd>
                      {team.readinessPercent == null
                        ? "Unknown"
                        : `${team.readinessPercent}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>Needs</dt>
                    <dd>{team.needs.length ? team.needs.join(", ") : "None flagged"}</dd>
                  </div>
                  <div>
                    <dt>ETA</dt>
                    <dd>
                      {team.etaMinutes == null ? "—" : `${team.etaMinutes} minutes`}
                    </dd>
                  </div>
                  <div>
                    <dt>Escalation</dt>
                    <dd>{team.escalation.replace(/_/g, " ")}</dd>
                  </div>
                  <div>
                    <dt>Ownership confidence</dt>
                    <dd>{team.ownership.confidence}</dd>
                  </div>
                  {team.volunteerSignals ? (
                    <>
                      <div>
                        <dt>Staffing confidence</dt>
                        <dd>{team.volunteerSignals.staffingConfidence}</dd>
                      </div>
                      <div>
                        <dt>Assignment confidence</dt>
                        <dd>{team.volunteerSignals.assignmentConfidence}</dd>
                      </div>
                      <div>
                        <dt>Open roles</dt>
                        <dd>{team.volunteerSignals.openRoles}</dd>
                      </div>
                      <div>
                        <dt>Backup / replacements</dt>
                        <dd>Unknown</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
                <ul className="field-resource-strip" aria-label="Resource status">
                  {(
                    [
                      ["People", team.resources.people],
                      ["Materials", team.resources.materials],
                      ["Transportation", team.resources.transportation],
                      ["Communications", team.resources.communications],
                      ["Venue", team.resources.venue],
                    ] as const
                  ).map(([label, state]) => (
                    <li key={label} data-state={state}>
                      <span>{label}</span>
                      <strong>{state.replace(/_/g, " ")}</strong>
                    </li>
                  ))}
                </ul>
                <FieldCheckIns
                  missionId={team.missionId}
                  eventVersion={team.eventVersion}
                  canCheckIn={team.canCheckIn}
                />
                <Link className="button secondary" href={team.href}>
                  Open mission
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel brief-advisory" data-advisory-status={advisory.status}>
        <h2>Field advisory</h2>
        {advisory.status === "advisory" && advisory.text ? (
          <>
            <p>{advisory.text}</p>
            {advisory.uncertaintyNote ? (
              <p className="muted">{advisory.uncertaintyNote}</p>
            ) : null}
          </>
        ) : (
          <p className="muted">
            {advisory.uncertaintyNote ||
              "Optional AI patterns are off by default. Help queue and escalation are deterministic."}
          </p>
        )}
        <Link className="button secondary" href="/field?advisory=1">
          Request advisory summary
        </Link>
      </section>

      <div className="button-row">
        <Link className="button" href="/command">
          Executive Command
        </Link>
        <Link className="button secondary" href="/">
          Today
        </Link>
        <Link className="button secondary" href="/more">
          More
        </Link>
      </div>
    </div>
  );
}
