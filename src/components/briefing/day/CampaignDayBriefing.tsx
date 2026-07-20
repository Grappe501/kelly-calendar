import Link from "next/link";
import {
  BriefingPrintButton,
  BriefingStaleNotice,
} from "@/components/briefing/day/BriefingClientChrome";
import type { CampaignDayBriefingViewModel } from "@/lib/missions/v21/day-briefing";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation";

type Props = {
  model: CampaignDayBriefingViewModel;
};

function refreshedLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function OverflowNote({ shown, total, href }: { shown: number; total: number; href: string }) {
  if (total <= shown) return null;
  return (
    <p className="muted briefing-overflow">
      Showing {shown} of {total}.{" "}
      <Link href={href}>View all in Mission Command Center</Link>
    </p>
  );
}

/**
 * V2.1 Campaign Day Briefing — read-only daily operating packet.
 */
export function CampaignDayBriefing({ model }: Props) {
  const s = model.executiveSummary;
  const timeNow = new Intl.DateTimeFormat("en-US", {
    timeZone: model.campaignTimezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(model.generatedAt));

  return (
    <article className="page-stack campaign-day-briefing">
      <header className="briefing-header">
        {model.dayKindLabel ? (
          <p className="briefing-day-kind">{model.dayKindLabel}</p>
        ) : null}
        <h1>Campaign Day Briefing</h1>
        <p className="briefing-date-line">{model.campaignDateLabel}</p>
        <p className="muted">
          {timeNow} · {model.campaignTimezone}
        </p>
        <p>
          Status: <strong>{model.briefingStatusLabel}</strong>
        </p>
        <p className="muted" role="status" aria-live="polite">
          Last refreshed at{" "}
          {refreshedLabel(model.generatedAt, model.campaignTimezone)}
        </p>
        <BriefingStaleNotice
          generatedAt={model.generatedAt}
          staleWarningMinutes={model.staleWarningMinutes}
        />
        {model.historicalDisclaimer ? (
          <p className="briefing-disclaimer" role="note">
            {model.historicalDisclaimer}
          </p>
        ) : null}

        <nav className="briefing-nav" aria-label="Briefing navigation">
          {model.navigation.previousHref ? (
            <Link href={model.navigation.previousHref}>Previous day</Link>
          ) : (
            <span className="muted">Previous day</span>
          )}
          <Link href={model.navigation.todayHref}>Today</Link>
          {model.navigation.nextHref ? (
            <Link href={model.navigation.nextHref}>Next day</Link>
          ) : (
            <span className="muted">Next day</span>
          )}
          <Link href={model.navigation.todaysMissionHref}>Today’s Mission</Link>
          <Link href={model.navigation.commandCenterHref}>
            Mission Command Center
          </Link>
          <Link href={model.navigation.calendarHref}>Calendar</Link>
          <Link href={`/system/briefing/${model.briefingDate}/launch`}>
            Launch Today
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/movement`}>
            Day Movement
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/logistics`}>
            Day Logistics
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/incidents`}>
            Day Incidents
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/exceptions`}>
            Exception Digest
          </Link>
          <Link href={`/system/briefing/${model.briefingDate}/closeout`}>
            Close Out Today
          </Link>
          <Link
            href={`/system/briefing/${model.briefingDate}`}
            className="briefing-refresh no-print"
          >
            Refresh Briefing
          </Link>
          <BriefingPrintButton />
        </nav>
      </header>

      <section
        className="panel briefing-section briefing-executive"
        aria-labelledby="briefing-exec-heading"
      >
        <h2 id="briefing-exec-heading">Morning summary</h2>
        <ul className="briefing-fact-list">
          <li>{s.scheduledMissionCount} Missions today</li>
          {s.firstMissionTime ? <li>First Mission: {s.firstMissionTime}</li> : null}
          {s.primaryMissionTitle ? (
            <li>Primary Mission: {s.primaryMissionTitle}</li>
          ) : null}
          <li>
            Leave by:{" "}
            {s.firstDepartureTime ?? "Departure time has not been prepared."}
          </li>
          <li>{s.preparationRiskCount} preparation items need attention</li>
          <li>{s.dueTodayCount} due today</li>
          <li>{s.overdueCount} overdue</li>
          <li>{s.leadershipDecisionCount} leadership decisions</li>
          {s.finalMissionTime ? <li>Final Mission: {s.finalMissionTime}</li> : null}
        </ul>
        {s.sentences.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
        {s.topAttentionItem ? (
          <p>
            Top attention: {s.topAttentionItem.label} —{" "}
            <Link href={s.topAttentionItem.href}>Open</Link>
          </p>
        ) : null}
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-primary-heading"
      >
        <h2 id="briefing-primary-heading">Today’s primary Mission</h2>
        {!model.primaryMission ? (
          <p className="muted">
            No primary Mission is selected for this campaign day.
          </p>
        ) : (
          <div className="briefing-primary-card">
            <h3>{model.primaryMission.title}</h3>
            <p className="muted">
              {model.primaryMission.whenLabel}
              {model.primaryMission.locationLabel
                ? ` · ${model.primaryMission.locationLabel}`
                : ""}
            </p>
            <p>
              {model.primaryMission.lifecyclePhaseLabel}
              {model.primaryMission.preparationReadiness
                ? ` · ${labelPreparationReadiness(model.primaryMission.preparationReadiness)}`
                : ""}
            </p>
            <dl className="briefing-dl">
              <div>
                <dt>Objective</dt>
                <dd>
                  {model.primaryMission.objective ??
                    "No objective is available."}
                </dd>
              </div>
              <div>
                <dt>What success looks like</dt>
                <dd>
                  {model.primaryMission.successCriteria.length ? (
                    <ul>
                      {model.primaryMission.successCriteria.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    "No success criteria are defined."
                  )}
                </dd>
              </div>
              <div>
                <dt>Key message</dt>
                <dd>
                  {model.primaryMission.keyMessage ??
                    "No key message has been prepared."}
                </dd>
              </div>
              <div>
                <dt>Who Kelly needs to find</dt>
                <dd>
                  {model.primaryMission.whoToFind.length
                    ? model.primaryMission.whoToFind.join(", ")
                    : "No people briefing has been entered."}
                </dd>
              </div>
              <div>
                <dt>What cannot be forgotten</dt>
                <dd>
                  {model.primaryMission.cannotForget.length
                    ? model.primaryMission.cannotForget.join(" · ")
                    : "No sensitivities or materials notes are prepared."}
                </dd>
              </div>
            </dl>
            <div className="button-row">
              <Link className="button" href={model.primaryMission.primaryHref}>
                {model.primaryMission.primaryActionLabel}
              </Link>
              <Link
                className="button secondary"
                href={model.primaryMission.secondaryHref}
              >
                {model.primaryMission.secondaryActionLabel}
              </Link>
            </div>
          </div>
        )}
      </section>

      {model.risks.length > 0 ? (
        <section
          className="panel briefing-section briefing-risks"
          aria-labelledby="briefing-risks-heading"
        >
          <h2 id="briefing-risks-heading">Risks and unresolved issues</h2>
          <ul className="briefing-list">
            {model.risks.map((r) => (
              <li key={r.id}>
                <p>
                  <span className={`briefing-sev briefing-sev-${r.severity.toLowerCase()}`}>
                    {r.severityLabel}
                  </span>{" "}
                  {r.categoryLabel}
                </p>
                <p>
                  <strong>{r.missionTitle ?? "Campaign"}</strong> — {r.issue}
                </p>
                <Link href={r.href}>Open workspace</Link>
              </li>
            ))}
          </ul>
          <OverflowNote
            shown={model.risks.length}
            total={model.risksTotal}
            href={model.navigation.commandCenterHref}
          />
        </section>
      ) : null}

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-due-heading"
      >
        <h2 id="briefing-due-heading">Due today</h2>
        {model.dueToday.length === 0 ? (
          <p className="muted">No actions are due for this campaign day.</p>
        ) : (
          <ul className="briefing-list">
            {model.dueToday.map((a) => (
              <li key={a.id}>
                <h3>{a.title}</h3>
                <p className="muted">
                  {a.missionTitle} · {a.sourceGroup.replace(/_/g, " ")} ·{" "}
                  {a.dueLabel}
                </p>
                <p>
                  Owner: {a.ownerLabel} · {a.statusLabel}
                  {a.priority ? ` · ${a.priority}` : ""}
                </p>
                <Link href={a.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
        <OverflowNote
          shown={model.dueToday.length}
          total={model.dueTodayTotal}
          href={`${model.navigation.commandCenterHref}?view=follow-up`}
        />
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-overdue-heading"
      >
        <h2 id="briefing-overdue-heading">Overdue responsibility</h2>
        {model.overdue.length === 0 ? (
          <p className="muted">No overdue responsibilities are open.</p>
        ) : (
          <ul className="briefing-list">
            {model.overdue.map((a) => (
              <li key={a.id}>
                <h3>{a.title}</h3>
                <p className="muted">
                  {a.missionTitle} · {a.dueLabel}
                </p>
                <Link href={a.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
        <OverflowNote
          shown={model.overdue.length}
          total={model.overdueTotal}
          href={`${model.navigation.commandCenterHref}?view=follow-up`}
        />
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-timeline-heading"
      >
        <h2 id="briefing-timeline-heading">Day timeline</h2>
        {model.timeline.length === 0 ? (
          <p className="muted">No timed items for this campaign day.</p>
        ) : (
          <ol className="briefing-timeline">
            {model.timeline.map((e) => (
              <li key={e.id}>
                <span className="briefing-timeline-time">{e.timeLabel}</span>
                <span className="briefing-timeline-type">{e.typeLabel}</span>
                <span className="briefing-timeline-title">
                  {e.href ? <Link href={e.href}>{e.title}</Link> : e.title}
                </span>
                {e.locationLabel ? (
                  <span className="muted"> · {e.locationLabel}</span>
                ) : null}
                {e.statusLabel ? (
                  <span className="muted"> · {e.statusLabel}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        <OverflowNote
          shown={model.timeline.length}
          total={model.timelineTotal}
          href={model.navigation.calendarHref}
        />
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-travel-heading"
      >
        <h2 id="briefing-travel-heading">Travel and movement</h2>
        {model.travel.length === 0 ? (
          <p className="muted">No Missions scheduled — no travel sequence.</p>
        ) : (
          <>
            <p className="briefing-travel-chain" aria-label="Travel sequence">
              {model.travel.map((leg, i) => (
                <span key={leg.id}>
                  {i > 0 ? " → " : null}
                  {leg.destinationLabel ?? leg.missionTitle}
                </span>
              ))}
            </p>
            <ul className="briefing-list">
              {model.travel.map((leg) => (
                <li key={leg.id}>
                  <h3>{leg.missionTitle}</h3>
                  <p className="muted">{leg.stateLabel}</p>
                  <p>
                    Departure:{" "}
                    {leg.departureLabel ??
                      "Departure time has not been prepared."}
                  </p>
                  <p>
                    Arrival target:{" "}
                    {leg.arrivalTargetLabel ?? "Arrival target is not set."}
                  </p>
                  <p>
                    Travel duration:{" "}
                    {leg.durationMinutes != null
                      ? `${leg.durationMinutes} minutes`
                      : "Travel duration is not available."}
                  </p>
                  {leg.parking ? <p>Parking: {leg.parking}</p> : null}
                  {leg.arrivalInstructions ? (
                    <p>Arrival: {leg.arrivalInstructions}</p>
                  ) : null}
                  <Link href={leg.href}>Open Prepare Mode</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-prep-heading"
      >
        <h2 id="briefing-prep-heading">Preparation requirements</h2>
        {model.preparation.length === 0 ? (
          <p className="muted">
            No preparation gaps are listed for today’s Missions.
          </p>
        ) : (
          <ul className="briefing-list">
            {model.preparation.map((p) => (
              <li key={p.id}>
                <h3>{p.missionTitle}</h3>
                <p>
                  {p.requirement} · {p.stateLabel}
                </p>
                {p.ownerLabel ? <p className="muted">Owner: {p.ownerLabel}</p> : null}
                <Link href={p.href}>Open Prepare Mode</Link>
              </li>
            ))}
          </ul>
        )}
        <OverflowNote
          shown={model.preparation.length}
          total={model.preparationTotal}
          href={`${model.navigation.commandCenterHref}?view=prepare`}
        />
      </section>

      <details className="panel briefing-section briefing-collapsible">
        <summary>
          <h2 id="briefing-messages-heading">Messages and audiences</h2>
        </summary>
        {model.missionMessages.length === 0 ? (
          <p className="muted">No Mission messages for this day.</p>
        ) : (
          <ul className="briefing-list">
            {model.missionMessages.map((m) => (
              <li key={m.missionId}>
                <h3>{m.missionTitle}</h3>
                <p>
                  Key message:{" "}
                  {m.keyMessage ?? "No key message has been prepared."}
                </p>
                {m.desiredImpression ? (
                  <p>Desired impression: {m.desiredImpression}</p>
                ) : null}
                {m.openingApproach ? <p>Opening: {m.openingApproach}</p> : null}
                {m.closingApproach ? <p>Closing: {m.closingApproach}</p> : null}
                {m.questionsToAsk.length ? (
                  <p>Questions: {m.questionsToAsk.join(" · ")}</p>
                ) : null}
                {m.commitmentsToAvoid.length ? (
                  <p>Avoid: {m.commitmentsToAvoid.join(" · ")}</p>
                ) : null}
                <Link href={m.href}>From Mission Brief</Link>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="panel briefing-section briefing-collapsible">
        <summary>
          <h2>People to know today</h2>
        </summary>
        {model.people.length === 0 ? (
          <p className="muted">No people briefing has been entered.</p>
        ) : (
          <ul className="briefing-list">
            {model.people.map((p) => (
              <li key={p.id}>
                <h3>{p.name}</h3>
                <p className="muted">
                  {p.role}
                  {p.organization ? ` · ${p.organization}` : ""} · {p.missionTitle}
                  {p.appearsInMissionCount > 1
                    ? ` · Appears in ${p.appearsInMissionCount} Missions today`
                    : ""}
                </p>
                {p.whyTheyMatter ? <p>{p.whyTheyMatter}</p> : null}
                {p.conversationGoal ? (
                  <p>Conversation goal: {p.conversationGoal}</p>
                ) : null}
                <Link href={p.href}>Open Prepare Mode</Link>
              </li>
            ))}
          </ul>
        )}
        <OverflowNote
          shown={model.people.length}
          total={model.peopleTotal}
          href={model.navigation.commandCenterHref}
        />
      </details>

      <details className="panel briefing-section briefing-collapsible">
        <summary>
          <h2>Organizations</h2>
        </summary>
        {model.organizations.length === 0 ? (
          <p className="muted">No organization briefing has been entered.</p>
        ) : (
          <ul className="briefing-list">
            {model.organizations.map((o) => (
              <li key={o.id}>
                <h3>{o.name}</h3>
                <p className="muted">
                  {o.missionTitle}
                  {o.appearsInMissionCount > 1
                    ? ` · Appears in ${o.appearsInMissionCount} Missions today`
                    : ""}
                </p>
                {o.whyItMatters ? <p>{o.whyItMatters}</p> : null}
                {o.desiredOutcome ? (
                  <p>Desired outcome: {o.desiredOutcome}</p>
                ) : null}
                <Link href={o.href}>Open Prepare Mode</Link>
              </li>
            ))}
          </ul>
        )}
      </details>

      <section
        className="panel briefing-section"
        id="leadership-decisions"
        aria-labelledby="briefing-decisions-heading"
      >
        <h2 id="briefing-decisions-heading">Leadership decisions</h2>
        {model.leadershipDecisions.length === 0 ? (
          <p className="muted">No leadership decisions are waiting.</p>
        ) : (
          <ul className="briefing-list">
            {model.leadershipDecisions.map((d) => (
              <li key={d.id}>
                <p>
                  <span className={`briefing-sev briefing-sev-${d.severity.toLowerCase()}`}>
                    {d.severityLabel}
                  </span>{" "}
                  {d.label}
                </p>
                <p className="muted">{d.missionTitle}</p>
                <p>{d.explanation}</p>
                <p className="muted">Permission: {d.requiredPermission}</p>
                <Link href={d.href}>Open workspace</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="panel briefing-section"
        aria-labelledby="briefing-eod-heading"
      >
        <h2 id="briefing-eod-heading">End-of-day responsibilities</h2>
        <p>
          Status: <strong>{model.endOfDayStatusLabel}</strong>
        </p>
        <p>
          <Link className="button" href={`/system/briefing/${model.briefingDate}/launch`}>
            Launch Today
          </Link>{" "}
          <Link className="button secondary" href={`/system/briefing/${model.briefingDate}/closeout`}>
            Close Out Today
          </Link>
        </p>
        {model.endOfDay.length === 0 ? (
          <p className="muted">
            No end-of-day responsibilities are listed from current records.
          </p>
        ) : (
          <ul className="briefing-list">
            {model.endOfDay.map((e) => (
              <li key={e.id}>
                <h3>{e.label}</h3>
                {e.missionTitle ? (
                  <p className="muted">{e.missionTitle}</p>
                ) : null}
                <Link href={e.href}>{e.actionLabel}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {model.tomorrowPreview ? (
        <section
          className="panel briefing-section"
          aria-labelledby="briefing-tomorrow-heading"
        >
          <h2 id="briefing-tomorrow-heading">Tomorrow preview</h2>
          {!model.tomorrowPreview.firstMissionTitle ? (
            <p className="muted">No Missions are scheduled for tomorrow.</p>
          ) : (
            <>
              <p>
                First Mission: {model.tomorrowPreview.firstMissionTimeLabel} —{" "}
                {model.tomorrowPreview.firstMissionTitle}
              </p>
              <p className="muted">
                {model.tomorrowPreview.locationLabel}
                {model.tomorrowPreview.preparationReadiness
                  ? ` · Preparation: ${labelPreparationReadiness(model.tomorrowPreview.preparationReadiness)}`
                  : ""}
              </p>
              <p>
                Departure time:{" "}
                {model.tomorrowPreview.departureLabel ??
                  "Departure time has not been prepared."}
              </p>
              {model.tomorrowPreview.preparationGap ? (
                <p>{model.tomorrowPreview.preparationGap}</p>
              ) : null}
              <p>
                {model.tomorrowPreview.dueTomorrowCount} commitment
                {model.tomorrowPreview.dueTomorrowCount === 1 ? "" : "s"} due
                tomorrow
              </p>
            </>
          )}
          <Link className="button" href={model.tomorrowPreview.briefingHref}>
            Open Tomorrow’s Briefing
          </Link>
        </section>
      ) : null}

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · {model.sourceStatus.missionCount}{" "}
          Missions · {model.sourceStatus.preparationCount} preparation records ·{" "}
          {model.sourceStatus.followUpActionCount} open Follow-up actions · Not a
          historical snapshot
        </p>
        <p>
          Read-only. Editing happens in Prepare, Execute, Debrief, and Follow-up
          workspaces.
        </p>
      </footer>

    </article>
  );
}
