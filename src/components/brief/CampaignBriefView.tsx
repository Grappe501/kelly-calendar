import Link from "next/link";
import type {
  CampaignBrief,
  CampaignBriefAdvisory,
} from "@/lib/missions/campaign-brief";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  brief: CampaignBrief;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

function formatUpdated(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CampaignBriefView({
  brief,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack campaign-brief">
      <header className="page-header">
        <p className="muted">Leadership scan</p>
        <h1>Today’s Campaign Brief</h1>
        <p className="muted">
          {brief.date} · {brief.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      {brief.completeness === "empty_day" ? (
        <section className="panel empty-state" aria-labelledby="brief-empty">
          <h2 id="brief-empty">No missions on today’s schedule</h2>
          <p className="muted">
            The day is clear in your permissioned view. Add a mission or check the
            calendar if you expected activity.
          </p>
          <div className="button-row">
            <Link className="button" href="/add">
              Add mission
            </Link>
            <Link className="button secondary" href="/">
              Today command
            </Link>
          </div>
        </section>
      ) : null}

      {brief.topBlocker ? (
        <section
          className="panel brief-blocker"
          data-priority={brief.topBlocker.priority}
          aria-labelledby="brief-blocker"
        >
          <h2 id="brief-blocker">Immediate attention</h2>
          <p className="brief-blocker-message">{brief.topBlocker.message}</p>
          {brief.topBlocker.href ? (
            <Link className="button" href={brief.topBlocker.href}>
              Open corrective action
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="panel" aria-labelledby="brief-next">
        <h2 id="brief-next">Next mission</h2>
        {brief.nextMission ? (
          <>
            <p className="brief-next-title">{brief.nextMission.title}</p>
            <dl className="brief-kv">
              <div>
                <dt>When</dt>
                <dd>{brief.nextMission.whenLabel}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{brief.nextMission.whereLabel}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{brief.nextMission.statusLabel}</dd>
              </div>
            </dl>
            <Link className="button" href={brief.nextMission.href}>
              Open next mission
            </Link>
          </>
        ) : (
          <p className="muted">No upcoming mission remaining today.</p>
        )}
      </section>

      {brief.requiredAction ? (
        <section className="panel" aria-labelledby="brief-action">
          <h2 id="brief-action">Required action</h2>
          <p>{brief.requiredAction.label}</p>
          <Link className="button" href={brief.requiredAction.href}>
            Take action
          </Link>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="brief-progress">
        <h2 id="brief-progress">Day progress</h2>
        <ul className="command-count-grid" aria-label="Mission progress">
          <li>
            <strong>{brief.missions.total}</strong>
            <span className="muted">Total</span>
          </li>
          <li>
            <strong>{brief.missions.completed}</strong>
            <span className="muted">Completed</span>
          </li>
          <li>
            <strong>{brief.missions.remaining}</strong>
            <span className="muted">Remaining</span>
          </li>
          <li>
            <strong>{brief.missions.inProgress}</strong>
            <span className="muted">In progress</span>
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="brief-ops">
        <h2 id="brief-ops">Operational totals</h2>
        {brief.completeness === "partial" ? (
          <p className="brief-partial" role="status">
            Partial data — some readiness, travel, or county fields are unknown.
          </p>
        ) : null}
        <dl className="brief-kv brief-ops-grid">
          <div>
            <dt>Readiness</dt>
            <dd>
              {brief.readiness.ready} ready · {brief.readiness.needsAttention}{" "}
              attention · {brief.readiness.blocked} blocked ·{" "}
              {brief.readiness.unknown} unknown
            </dd>
          </div>
          <div>
            <dt>Travel</dt>
            <dd>
              {brief.travel.knownDriveMinutes == null
                ? "No drive times computed"
                : `${brief.travel.knownDriveMinutes} min planned`}
              {brief.travel.nextMissionDriveMinutes != null
                ? ` · next ${brief.travel.nextMissionDriveMinutes} min`
                : ""}
              {brief.travel.knownDriveMinutesPartial ? " · partial" : ""}
            </dd>
          </div>
          <div>
            <dt>People</dt>
            <dd>
              {brief.people.detail ||
                "No staffing gaps flagged in permissioned view"}
              {brief.people.unassignedRoles > 0
                ? ` · ${brief.people.unassignedRoles} unassigned role(s)`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Conflicts</dt>
            <dd>
              {brief.conflicts.unresolvedCount === 0
                ? "None detected"
                : `${brief.conflicts.unresolvedCount} unresolved (${brief.conflicts.criticalCount} high/critical)`}
              {brief.conflicts.topConflict
                ? ` · ${brief.conflicts.topConflict.explanation}`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Counties</dt>
            <dd>
              {brief.counties.names.length === 0
                ? "None named"
                : brief.counties.names.join(", ")}
              {brief.counties.unknownCountyMissions > 0
                ? ` · ${brief.counties.unknownCountyMissions} without county`
                : ""}
            </dd>
          </div>
          <div>
            <dt>Follow-up</dt>
            <dd>
              {brief.followUp.detail || "No outstanding follow-up flagged"}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatUpdated(brief.lastUpdatedAt, brief.timezone)}</dd>
          </div>
        </dl>
        {brief.followUp.href ? (
          <Link className="button secondary" href={brief.followUp.href}>
            Open follow-up mission
          </Link>
        ) : null}
        {brief.conflicts.topConflict?.href ? (
          <Link
            className="button secondary"
            href={brief.conflicts.topConflict.href}
          >
            Review top conflict
          </Link>
        ) : null}
      </section>

      <section
        className="panel brief-advisory"
        aria-labelledby="brief-advisory"
        data-advisory-status={advisory.status}
      >
        <h2 id="brief-advisory">{advisory.label}</h2>
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
              "Optional AI narrative is off by default. Deterministic brief above is the source of truth."}
          </p>
        )}
        <Link className="button secondary" href="/brief?advisory=1">
          Request advisory summary
        </Link>
      </section>

      <div className="button-row">
        <Link className="button secondary" href="/">
          Back to Today
        </Link>
        <Link className="button secondary" href="/more">
          More
        </Link>
      </div>
    </div>
  );
}
