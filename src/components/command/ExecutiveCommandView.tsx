import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { ExecutiveCommand } from "@/lib/missions/executive-command";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  command: ExecutiveCommand;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function ExecutiveCommandView({
  command,
  advisory,
  viewerDisplayName,
}: Props) {
  const health = command.campaignHealth;
  const today = command.todaysCampaign;

  return (
    <div className="page-stack executive-command">
      <header className="page-header">
        <p className="muted">Morning briefing · 60 seconds</p>
        <h1>Executive Command</h1>
        <p className="muted">
          {command.date} · {command.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel exec-section" aria-labelledby="exec-today">
        <h2 id="exec-today">Today’s Campaign</h2>
        <ol className="exec-priority-list">
          {today.topPriorities.map((p) => (
            <li key={p.label} data-urgency={p.urgency}>
              <strong>{p.label}</strong>
              <span>{p.detail}</span>
              {p.href ? (
                <Link className="button" href={p.href}>
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
        <dl className="brief-kv">
          <div>
            <dt>Where Kelly needs to be</dt>
            <dd>{today.whereKellyNeedsToBe ?? "No upcoming location in view"}</dd>
          </div>
          <div>
            <dt>Decisions requiring attention</dt>
            <dd>
              {today.decisionsRequiringAttention.length === 0
                ? "None flagged"
                : today.decisionsRequiringAttention.join(" · ")}
            </dd>
          </div>
          <div>
            <dt>What could fail today’s plan</dt>
            <dd>{today.planFailureRisks.join(" · ")}</dd>
          </div>
        </dl>
      </section>

      <section className="panel exec-section" aria-labelledby="exec-health">
        <h2 id="exec-health">Campaign Health</h2>
        <ul className="command-count-grid" aria-label="Campaign health">
          <li>
            <strong>{health.missionsTotal}</strong>
            <span className="muted">Missions</span>
          </li>
          <li>
            <strong>{health.missionsCompleted}</strong>
            <span className="muted">Completed</span>
          </li>
          <li>
            <strong>{health.missionsInProgress}</strong>
            <span className="muted">In progress</span>
          </li>
          <li>
            <strong>{health.missionsUpcoming}</strong>
            <span className="muted">Upcoming</span>
          </li>
          <li>
            <strong>{health.countiesActive}</strong>
            <span className="muted">Counties active</span>
          </li>
          <li>
            <strong>{health.eventsToday}</strong>
            <span className="muted">Events today</span>
          </li>
          <li>
            <strong>—</strong>
            <span className="muted">Volunteers (unknown)</span>
          </li>
          <li>
            <strong>{health.readinessScore.blocked}</strong>
            <span className="muted">Blocked</span>
          </li>
        </ul>
        <p>
          <strong>Readiness:</strong> {health.readinessScore.label} (
          {health.readinessScore.ready} ready ·{" "}
          {health.readinessScore.needsAttention} attention ·{" "}
          {health.readinessScore.unknown} unknown)
        </p>
        {health.operationalAlerts.length > 0 ? (
          <ul className="exec-alerts">
            {health.operationalAlerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No operational alerts.</p>
        )}
      </section>

      <section className="panel exec-section" aria-labelledby="exec-inbox">
        <h2 id="exec-inbox">Executive Inbox</h2>
        <ul className="exec-inbox-list">
          {command.executiveInbox.map((item) => (
            <li key={item.id} data-status={item.status}>
              <div>
                <strong>{item.title}</strong>
                <span className="muted"> · {item.category}</span>
                <p>{item.detail}</p>
              </div>
              {item.href && item.status === "actionable" ? (
                <Link className="button secondary" href={item.href}>
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel exec-section" aria-labelledby="exec-geo">
        <h2 id="exec-geo">Geographic Operations</h2>
        <div className="exec-ar-silhouette" aria-hidden="true">
          <svg viewBox="0 0 120 100" role="img">
            <title>Arkansas outline</title>
            <path
              d="M18 28 L102 22 L108 78 L22 86 Z"
              fill="rgba(15,76,92,0.12)"
              stroke="rgba(15,76,92,0.55)"
              strokeWidth="2"
            />
          </svg>
        </div>
        {command.geographic.counties.length === 0 ? (
          <p className="muted">No named counties on today’s missions.</p>
        ) : (
          <ul className="exec-county-chips" aria-label="Counties active today">
            {command.geographic.counties.map((c) => (
              <li key={c.countyName} data-status={c.status}>
                <strong>{c.countyName}</strong>
                <span>{c.missionCount} mission(s) · active today</span>
              </li>
            ))}
          </ul>
        )}
        {command.geographic.unknownCountyMissions > 0 ? (
          <p className="brief-partial">
            {command.geographic.unknownCountyMissions} mission(s) without county.
          </p>
        ) : null}
        <p className="muted">{command.geographic.note}</p>
      </section>

      <section className="panel exec-section" aria-labelledby="exec-rhythm">
        <h2 id="exec-rhythm">Campaign Rhythm</h2>
        <ol className="exec-rhythm-list">
          {command.rhythm.map((block) => (
            <li key={block.id} data-kind={block.kind} data-current={block.isCurrent}>
              <strong>{block.label}</strong>
              {block.whenLabel ? <span>{block.whenLabel}</span> : null}
              {block.href ? (
                <Link className="button secondary" href={block.href}>
                  Go
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="panel exec-section" aria-labelledby="exec-briefing">
        <h2 id="exec-briefing">Executive Briefing</h2>
        <p className="exec-briefing-text">{command.executiveBriefing.text}</p>
        <p className="muted">Source: {command.executiveBriefing.source}</p>
        <div className="brief-advisory" data-advisory-status={advisory.status}>
          <h3>{advisory.label}</h3>
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
                "Optional AI narrative is off by default. Deterministic briefing is the source of truth."}
            </p>
          )}
          <Link className="button secondary" href="/command?advisory=1">
            Request advisory summary
          </Link>
        </div>
      </section>

      <div className="button-row">
        <Link className="button" href="/">
          Today
        </Link>
        <Link className="button secondary" href="/brief">
          Campaign Brief
        </Link>
        <Link className="button secondary" href="/more">
          More
        </Link>
      </div>
    </div>
  );
}
