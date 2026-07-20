import Link from "next/link";
import type { MissionCommandCenterViewModel } from "@/lib/missions/v21/command-center";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation";

type Props = {
  model: MissionCommandCenterViewModel;
};

function viewHref(
  view: string,
  filters: MissionCommandCenterViewModel["filters"],
): string {
  const params = new URLSearchParams();
  if (view !== "overview") params.set("view", view);
  if (filters.phase) params.set("phase", filters.phase.toLowerCase());
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return qs
    ? `/system/missions/command-center?${qs}`
    : "/system/missions/command-center";
}

function refreshedLabel(generatedAt: string): string {
  const ms = Date.now() - new Date(generatedAt).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 1) return "Last refreshed just now";
  if (minutes === 1) return "Last refreshed 1 minute ago";
  return `Last refreshed ${minutes} minutes ago`;
}

function SeverityBadge({
  severity,
  label,
}: {
  severity: string;
  label: string;
}) {
  return (
    <span
      className={`cc-severity cc-severity-${severity.toLowerCase()}`}
      aria-label={`Severity: ${label}`}
    >
      {label}
    </span>
  );
}

/**
 * V2.1 Mission Command Center — read-only cross-Mission operating surface.
 * Aggregate here; operate in the owning workspace.
 */
export function MissionCommandCenter({ model }: Props) {
  const { summary, filters } = model;
  const staleMinutes =
    (Date.now() - new Date(model.generatedAt).getTime()) / 60_000;
  const mayBeStale = staleMinutes > 15;

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: model.campaignTimezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(model.generatedAt));

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: model.campaignTimezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(model.generatedAt));

  return (
    <div className="page-stack command-center">
      <header className="command-center-header">
        <p className="command-center-kicker">{dateLabel}</p>
        <h1>Mission Command Center</h1>
        <p className="command-center-subtitle">
          What is active, what is next, and what needs leadership attention.
        </p>
        <p className="muted">
          {timeLabel} · {model.campaignTimezone}
        </p>
        <p className="muted" role="status" aria-live="polite">
          {refreshedLabel(model.generatedAt)}
          {mayBeStale
            ? " · This operating view may be out of date."
            : null}
        </p>

        <ul className="command-center-stats" aria-label="Command summary">
          <li>
            <span className="command-center-stat-value">{summary.activeNow}</span>
            <span className="command-center-stat-label">Active now</span>
          </li>
          <li>
            <span className="command-center-stat-value">
              {summary.needsAttention}
            </span>
            <span className="command-center-stat-label">Need attention</span>
          </li>
          <li>
            <span className="command-center-stat-value">
              {summary.overdueCommitments}
            </span>
            <span className="command-center-stat-label">Overdue commitments</span>
          </li>
          <li>
            <span className="command-center-stat-value">
              {summary.debriefAwaitingApproval}
            </span>
            <span className="command-center-stat-label">Awaiting Debrief approval</span>
          </li>
          <li>
            <span className="command-center-stat-value">
              {summary.readyToClose}
            </span>
            <span className="command-center-stat-label">Ready to close</span>
          </li>
        </ul>

        <nav className="command-center-nav" aria-label="Command Center navigation">
          <Link href="/">Today’s Mission</Link>
          <Link href="/calendar">Calendar</Link>
          <Link href="/system/missions">Mission index</Link>
          <Link href={viewHref("overview", filters)}>Refresh</Link>
        </nav>

        <nav className="command-center-filters" aria-label="Command Center views">
          {(
            [
              ["overview", "Overview"],
              ["attention", "Needs attention"],
              ["prepare", "Prepare"],
              ["execute", "Execute"],
              ["debrief", "Debrief"],
              ["follow-up", "Follow-up"],
              ["closeout", "Ready to close"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={viewHref(key, filters)}
              className={
                filters.activeView === key
                  ? "command-center-filter is-active"
                  : "command-center-filter"
              }
              aria-current={filters.activeView === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {(filters.activeView === "overview" ||
        filters.activeView === "attention") && (
        <section
          className="panel command-center-section command-center-attention"
          aria-labelledby="cc-attention-heading"
        >
          <h2 id="cc-attention-heading">Immediate attention</h2>
          {model.immediateAttention.length === 0 ? (
            <p className="muted">
              No Missions currently require leadership intervention.
            </p>
          ) : (
            <ul className="command-center-list">
              {model.immediateAttention.map((item) => (
                <li key={item.id} className="command-center-card">
                  <div className="command-center-card-top">
                    <SeverityBadge
                      severity={item.severity}
                      label={item.severityLabel}
                    />
                    <span className="muted">{item.phaseLabel}</span>
                  </div>
                  <h3>{item.missionTitle}</h3>
                  <p>
                    <strong>{item.label}</strong>
                  </p>
                  <p className="muted">{item.explanation}</p>
                  {item.timeContext ? (
                    <p className="muted">{item.timeContext}</p>
                  ) : null}
                  <Link className="button" href={item.href}>
                    {item.primaryActionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {filters.activeView === "overview" && summary.needsAttention > 10 ? (
            <p>
              <Link href={viewHref("attention", filters)}>View all attention items</Link>
            </p>
          ) : null}
        </section>
      )}

      {(filters.activeView === "overview" ||
        filters.activeView === "execute") && (
        <section
          className="panel command-center-section"
          aria-labelledby="cc-active-heading"
        >
          <h2 id="cc-active-heading">Active now</h2>
          {model.activeNow.length === 0 ? (
            <p className="muted">No Mission is currently in active execution.</p>
          ) : (
            <ul className="command-center-list">
              {model.activeNow.map((m) => (
                <li key={m.missionId} className="command-center-card">
                  <h3>{m.title}</h3>
                  <p className="muted">{m.whenLabel}</p>
                  <p className="muted">{m.locationLabel ?? "Location unknown"}</p>
                  <p>
                    Execution: {m.executionStatus ?? "None"} · Prep:{" "}
                    {m.preparationReadiness
                      ? labelPreparationReadiness(m.preparationReadiness)
                      : "None"}
                  </p>
                  {m.keyMessage ? (
                    <p className="command-center-key-message">{m.keyMessage}</p>
                  ) : null}
                  {m.urgentOpenCount > 0 ? (
                    <p className="muted">
                      {m.urgentOpenCount} open urgent commitment
                      {m.urgentOpenCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  <div className="button-row">
                    <Link className="button" href={m.primaryHref}>
                      {m.primaryActionLabel}
                    </Link>
                    <Link
                      className="button secondary"
                      href={`/system/missions/${m.missionId}/prepare`}
                    >
                      Open Mission Brief
                    </Link>
                    <Link
                      className="button secondary"
                      href={`/system/missions/${m.missionId}`}
                    >
                      View Mission Record
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href="/">Open Today’s Mission</Link>
          </p>
        </section>
      )}

      {filters.activeView === "overview" && (
        <section
          className="panel command-center-section"
          aria-labelledby="cc-next-heading"
        >
          <h2 id="cc-next-heading">Coming next</h2>
          {model.comingNext.length === 0 ? (
            <p className="muted">No upcoming Missions in the operating window.</p>
          ) : (
            <ul className="command-center-list">
              {model.comingNext.map((m) => (
                <li key={m.missionId} className="command-center-card">
                  <h3>{m.title}</h3>
                  <p className="muted">{m.whenLabel}</p>
                  <p className="muted">{m.locationLabel ?? "Location unknown"}</p>
                  <p>
                    {m.lifecyclePhaseLabel}
                    {m.preparationReadiness
                      ? ` · ${labelPreparationReadiness(m.preparationReadiness)}`
                      : " · No preparation"}
                    {m.travelRequired ? " · Travel required" : ""}
                  </p>
                  <Link className="button" href={m.primaryHref}>
                    {m.primaryActionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href="/calendar">View Full Calendar</Link>
          </p>
        </section>
      )}

      {(filters.activeView === "overview" ||
        filters.activeView === "prepare") && (
        <section
          className="panel command-center-section"
          aria-labelledby="cc-prep-heading"
        >
          <h2 id="cc-prep-heading">Preparation risk</h2>
          {model.preparationRisk.length === 0 ? (
            <p className="muted">
              No upcoming Missions currently show preparation risk.
            </p>
          ) : (
            <ul className="command-center-list">
              {model.preparationRisk.map((m) => (
                <li key={m.missionId} className="command-center-card">
                  <h3>{m.title}</h3>
                  <p className="muted">{m.whenLabel}</p>
                  <p>
                    Readiness:{" "}
                    {m.readiness
                      ? labelPreparationReadiness(m.readiness)
                      : "Absent"}{" "}
                    · About {m.hoursUntilStart} hour
                    {m.hoursUntilStart === 1 ? "" : "s"} remaining
                  </p>
                  {m.gaps.length ? (
                    <ul className="command-center-gaps">
                      {m.gaps.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Link className="button" href={m.href}>
                    Open Prepare Mode
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(filters.activeView === "overview" ||
        filters.activeView === "execute") &&
        model.executionExceptions.length > 0 && (
          <section
            className="panel command-center-section"
            aria-labelledby="cc-exec-ex-heading"
          >
            <h2 id="cc-exec-ex-heading">Active execution exceptions</h2>
            <ul className="command-center-list">
              {model.executionExceptions.map((row) => (
                <li
                  key={`${row.missionId}:${row.label}`}
                  className="command-center-card"
                >
                  <h3>{row.title}</h3>
                  <p>{row.label}</p>
                  <p className="muted">{row.explanation}</p>
                  <Link className="button" href={row.href}>
                    Open Execute Mode
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

      {(filters.activeView === "overview" ||
        filters.activeView === "debrief") && (
        <section
          className="panel command-center-section"
          aria-labelledby="cc-debrief-heading"
        >
          <h2 id="cc-debrief-heading">Debrief queue</h2>
          {model.debriefQueue.length === 0 ? (
            <p className="muted">
              No completed Debriefs are waiting for work or approval.
            </p>
          ) : (
            <ul className="command-center-list">
              {model.debriefQueue.map((row) => (
                <li key={`${row.missionId}:${row.group}`} className="command-center-card">
                  <p className="muted">{row.groupLabel}</p>
                  <h3>{row.title}</h3>
                  <p className="muted">{row.eventWhenLabel}</p>
                  <p>
                    Status: {row.debriefStatus ?? "None"}
                    {row.outcomeAssessment
                      ? ` · Outcome: ${row.outcomeAssessment}`
                      : ""}
                  </p>
                  {row.ageLabel ? (
                    <p className="muted">Age since execution ended: {row.ageLabel}</p>
                  ) : null}
                  <Link className="button" href={row.href}>
                    {row.primaryActionLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(filters.activeView === "overview" ||
        filters.activeView === "follow-up") && (
        <>
          <section
            className="panel command-center-section"
            aria-labelledby="cc-fu-heading"
          >
            <h2 id="cc-fu-heading">Follow-up accountability</h2>
            {model.followUpAccountability.length === 0 ? (
              <p className="muted">No unresolved Follow-up work requires review.</p>
            ) : (
              <ul className="command-center-list">
                {model.followUpAccountability.map((row) => (
                  <li key={row.actionId} className="command-center-card">
                    <p className="muted">
                      {row.bucket.replace(/_/g, " ")} · {row.priority}
                    </p>
                    <h3>{row.title}</h3>
                    <p className="muted">
                      {row.missionTitle} · {row.sourceLabel}
                    </p>
                    <p>
                      Owner: {row.ownerLabel} · {row.dueLabel} · {row.statusLabel}
                    </p>
                    {row.relatedLabel ? (
                      <p className="muted">{row.relatedLabel}</p>
                    ) : null}
                    <Link className="button" href={row.href}>
                      Open Follow-up
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="panel command-center-section"
            aria-labelledby="cc-commit-heading"
          >
            <h2 id="cc-commit-heading">Commitment watch</h2>
            {model.commitments.length === 0 ? (
              <p className="muted">No campaign commitments are overdue.</p>
            ) : (
              <ul className="command-center-list">
                {model.commitments.map((row) => (
                  <li key={row.actionId} className="command-center-card">
                    <p className="muted">{row.bucket.replace(/_/g, " ")}</p>
                    <h3>{row.commitmentText}</h3>
                    <p className="muted">{row.missionTitle}</p>
                    <p>
                      Owner: {row.ownerLabel} · {row.dueLabel}
                    </p>
                    <Link className="button" href={row.href}>
                      Open Follow-up action
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="panel command-center-section"
            aria-labelledby="cc-blocked-heading"
          >
            <h2 id="cc-blocked-heading">Blocked work</h2>
            {model.blockedWork.length === 0 ? (
              <p className="muted">No Follow-up actions are currently blocked.</p>
            ) : (
              <ul className="command-center-list">
                {model.blockedWork.map((row) => (
                  <li key={row.actionId} className="command-center-card">
                    <h3>{row.title}</h3>
                    <p className="muted">{row.missionTitle}</p>
                    <p>
                      Owner: {row.ownerLabel} · Priority: {row.priority}
                    </p>
                    {row.blockedReason ? (
                      <p>{row.blockedReason}</p>
                    ) : (
                      <p className="muted">No blocked reason recorded.</p>
                    )}
                    <Link className="button" href={row.href}>
                      Open Follow-up workspace
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {(filters.activeView === "overview" ||
        filters.activeView === "closeout") && (
        <section
          className="panel command-center-section"
          aria-labelledby="cc-close-heading"
        >
          <h2 id="cc-close-heading">Ready to close</h2>
          {model.readyToClose.length === 0 ? (
            <p className="muted">No Missions are currently ready for closeout.</p>
          ) : (
            <ul className="command-center-list">
              {model.readyToClose.map((row) => (
                <li key={row.missionId} className="command-center-card">
                  <h3>{row.title}</h3>
                  <p className="muted">{row.eventWhenLabel}</p>
                  <p>
                    Completed: {row.completedCount} · Cancelled:{" "}
                    {row.cancelledCount}
                    {row.outcomeAssessment
                      ? ` · Outcome: ${row.outcomeAssessment}`
                      : ""}
                  </p>
                  <Link className="button" href={row.href}>
                    Review Mission Closeout
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {filters.activeView === "overview" && (
        <>
          <section
            className="panel command-center-section"
            aria-labelledby="cc-recent-heading"
          >
            <h2 id="cc-recent-heading">Recently closed</h2>
            {model.recentlyClosed.length === 0 ? (
              <p className="muted">No Missions closed in the last 7 days.</p>
            ) : (
              <ul className="command-center-list">
                {model.recentlyClosed.map((row) => (
                  <li key={row.missionId} className="command-center-card">
                    <h3>{row.title}</h3>
                    <p className="muted">{row.eventWhenLabel}</p>
                    <p className="muted">
                      Closed {row.closedAt.slice(0, 10)}
                      {row.outcomeAssessment
                        ? ` · ${row.outcomeAssessment}`
                        : ""}
                      {` · ${row.completedCommitments} completed commitment${
                        row.completedCommitments === 1 ? "" : "s"
                      }`}
                    </p>
                    <Link className="button secondary" href={row.reportHref}>
                      Open closeout report
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="panel command-center-section"
            aria-labelledby="cc-summary-heading"
          >
            <h2 id="cc-summary-heading">Operational summary</h2>
            <ul className="command-center-summary-grid">
              <li>
                <Link href={viewHref("execute", filters)}>
                  Active now: {summary.activeNow}
                </Link>
              </li>
              <li>Next 7 days: {summary.upcomingSevenDays}</li>
              <li>
                <Link href={viewHref("prepare", filters)}>
                  Preparation risk: {summary.preparationRisk}
                </Link>
              </li>
              <li>
                <Link href={viewHref("debrief", filters)}>
                  Debrief pending: {summary.debriefPending}
                </Link>
              </li>
              <li>
                <Link href={viewHref("debrief", filters)}>
                  Awaiting approval: {summary.debriefAwaitingApproval}
                </Link>
              </li>
              <li>
                <Link href={viewHref("follow-up", filters)}>
                  Open Follow-ups: {summary.openFollowUps}
                </Link>
              </li>
              <li>
                <Link href={viewHref("follow-up", filters)}>
                  Overdue commitments: {summary.overdueCommitments}
                </Link>
              </li>
              <li>
                <Link href={viewHref("follow-up", filters)}>
                  Blocked actions: {summary.blockedActions}
                </Link>
              </li>
              <li>
                <Link href={viewHref("closeout", filters)}>
                  Ready to close: {summary.readyToClose}
                </Link>
              </li>
              <li>Closed last 7 days: {summary.recentlyClosed}</li>
            </ul>
            <p className="muted">
              Read-only operating view. Editing happens in Prepare, Execute,
              Debrief, and Follow-up workspaces.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
