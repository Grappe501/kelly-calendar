import Link from "next/link";
import { CloseoutActions } from "@/components/briefing/closeout/CloseoutActions";
import type { CampaignDayCloseoutViewModel } from "@/lib/missions/v21/day-closeout";

type Props = { model: CampaignDayCloseoutViewModel };

function Overflow({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <p className="muted briefing-overflow">
      Showing {shown} of {total} items.{" "}
      <Link href="/system/missions/command-center">
        View all in Mission Command Center
      </Link>
    </p>
  );
}

export function CampaignDayCloseout({ model }: Props) {
  return (
    <article className="page-stack campaign-day-closeout">
      <header className="briefing-header">
        <h1>Campaign Day Closeout</h1>
        <p className="executive-question">
          Verify today’s work, carry forward what remains, and prepare tomorrow.
        </p>
        <p className="briefing-date-line">{model.closingHeading}</p>
        <p className="muted">
          {model.timezone} · Status: <strong>{model.closeout.statusLabel}</strong>{" "}
          · Today: {model.closeout.todayAssessmentLabel} · Tomorrow:{" "}
          {model.closeout.tomorrowReadinessLabel}
          {model.closeout.derivedTomorrowReadiness !==
          model.closeout.tomorrowReadiness
            ? ` (derived: ${model.closeout.derivedTomorrowReadinessLabel})`
            : ""}
        </p>
        {model.historicalNotice ? (
          <p className="briefing-disclaimer" role="note">
            {model.historicalNotice}
          </p>
        ) : null}
        <nav className="briefing-nav" aria-label="Closeout navigation">
          {model.navigation.previousHref ? (
            <Link href={model.navigation.previousHref}>Previous day</Link>
          ) : null}
          <Link href={model.navigation.todayHref}>Today</Link>
          {model.navigation.nextHref ? (
            <Link href={model.navigation.nextHref}>Next day</Link>
          ) : null}
          <Link href={model.navigation.briefingHref}>Day Briefing</Link>
          <Link href={`/system/briefing/${model.campaignDate}/launch`}>
            Morning Launch Review
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/incidents`}>
            Day Incidents
          </Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.calendarHref}>Calendar</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel briefing-section" aria-labelledby="closeout-summary-h">
        <h2 id="closeout-summary-h">Day status summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.scheduledMissions} Missions scheduled</li>
          <li>{model.summary.completedExecutions} executions completed</li>
          <li>{model.summary.activeExecutions} still active</li>
          <li>{model.summary.debriefNotStarted} Debriefs not started</li>
          <li>{model.summary.debriefInProgress} Debriefs in progress</li>
          <li>
            {model.summary.debriefAwaitingApproval} Debriefs awaiting approval
          </li>
          <li>{model.summary.openDueToday} open due-today actions</li>
          <li>{model.summary.overdue} overdue</li>
          <li>{model.summary.openCommitments} open commitments</li>
          <li>{model.summary.leadershipDecisions} leadership decisions</li>
          <li>
            {model.summary.tomorrowPreparationRisks} tomorrow preparation risks
          </li>
          <li>{model.summary.tomorrowConflicts} tomorrow schedule conflicts</li>
        </ul>
        {model.summary.scheduledMissions === 0 ? (
          <p>
            No Missions were scheduled today. Campaign responsibility may still
            remain in follow-up, approvals, and tomorrow preparation.
          </p>
        ) : null}
      </section>

      {model.integrityWarnings.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="closeout-integrity-h">
          <h2 id="closeout-integrity-h">Record review needed</h2>
          <ul>
            {model.integrityWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.activeExecutions.length > 0 ? (
        <section className="panel briefing-section" aria-labelledby="closeout-exec-h">
          <h2 id="closeout-exec-h">Active execution review</h2>
          <ul className="briefing-list">
            {model.activeExecutions.map((e) => (
              <li key={e.missionId}>
                <h3>{e.title}</h3>
                <p>
                  Status: {e.executionStatus} · Scheduled end:{" "}
                  {e.scheduledEndLabel}
                </p>
                <p className="muted">
                  Execution is still marked in progress
                  {e.timeSinceScheduledEnd
                    ? ` · ${e.timeSinceScheduledEnd} past scheduled end`
                    : ""}
                  .
                </p>
                <Link href={e.href}>Open Execute Mode</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel briefing-section" aria-labelledby="closeout-missions-h">
        <h2 id="closeout-missions-h">Missions scheduled today</h2>
        <Overflow
          shown={model.todayMissions.length}
          total={model.todayMissionsTotal}
        />
        {model.todayMissions.length === 0 ? (
          <p className="muted">No Missions intersect this campaign day.</p>
        ) : (
          <ul className="briefing-list">
            {model.todayMissions.map((m) => (
              <li key={m.missionId}>
                <h3>{m.title}</h3>
                <p className="muted">
                  {m.whenLabel}
                  {m.locationLabel ? ` · ${m.locationLabel}` : ""}
                </p>
                <p>
                  {m.classificationLabel} · {m.lifecyclePhase} · Exec:{" "}
                  {m.executionStatus ?? "—"} · Debrief:{" "}
                  {m.debriefStatus ?? "—"}
                </p>
                <Link href={m.href}>{m.primaryActionLabel}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-debrief-h">
        <h2 id="closeout-debrief-h">Debrief capture review</h2>
        {model.debriefReview.length === 0 ? (
          <p className="muted">No Debrief review items for this day.</p>
        ) : (
          <ul className="briefing-list">
            {model.debriefReview.map((d) => (
              <li key={d.missionId}>
                <h3>{d.title}</h3>
                <p>
                  {d.group.replaceAll("_", " ")} · {d.debriefStatus}
                </p>
                <Link href={d.href}>{d.primaryActionLabel}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-commit-h">
        <h2 id="closeout-commit-h">Commitments</h2>
        {model.commitments.length === 0 ? (
          <p className="muted">No commitment-derived Follow-up actions loaded.</p>
        ) : (
          <ul className="briefing-list">
            {model.commitments.map((c) => (
              <li key={c.id}>
                <h3>{c.title}</h3>
                <p className="muted">
                  {c.missionTitle} · {c.ownerLabel} · {c.status}
                </p>
                {c.flags.length ? <p>{c.flags.join(" · ")}</p> : null}
                <Link href={c.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-due-h">
        <h2 id="closeout-due-h">Due today</h2>
        {model.dueToday.length === 0 ? (
          <p className="muted">No due-today items.</p>
        ) : (
          <ul className="briefing-list">
            {model.dueToday.map((a) => (
              <li key={`${a.id}-${a.statusBucket}`}>
                <h3>{a.title}</h3>
                <p className="muted">
                  {a.statusBucket} · {a.ownerLabel} · {a.dueLabel}
                </p>
                <Link href={a.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-overdue-h">
        <h2 id="closeout-overdue-h">Overdue work</h2>
        {model.overdue.length === 0 ? (
          <p className="muted">No overdue items in the closeout pool.</p>
        ) : (
          <ul className="briefing-list">
            {model.overdue.map((a) => (
              <li key={a.id}>
                <h3>{a.title}</h3>
                <p className="muted">
                  {a.dueLabel} · {a.priority} · {a.ownerLabel}
                </p>
                <Link href={a.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-lead-h">
        <h2 id="closeout-lead-h">Leadership decisions</h2>
        {model.leadershipDecisions.length === 0 ? (
          <p className="muted">No leadership decisions pending from records.</p>
        ) : (
          <ul className="briefing-list">
            {model.leadershipDecisions.map((d) => (
              <li key={d.id}>
                <h3>{d.label}</h3>
                <p>{d.explanation}</p>
                <Link href={d.href}>Open workspace</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-cf-h">
        <h2 id="closeout-cf-h">Carry-forward register</h2>
        {model.carryForwardItems.length === 0 ? (
          <p className="muted">
            No carry-forward items yet. Confirm suggestions below when needed.
          </p>
        ) : (
          <ul className="briefing-list">
            {model.carryForwardItems.map((i) => (
              <li key={i.id}>
                <h3>{i.title}</h3>
                <p className="muted">
                  {i.sourceTypeLabel} · {i.statusLabel} · {i.ownerLabel}
                  {i.targetDateKey ? ` · target ${i.targetDateKey}` : ""}
                </p>
                {i.destination ? (
                  <Link href={i.destination}>Open destination</Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-tmr-h">
        <h2 id="closeout-tmr-h">Tomorrow’s first Mission</h2>
        {!model.tomorrowFirstMission ? (
          <p>No Missions are scheduled tomorrow.</p>
        ) : (
          <>
            <h3>{model.tomorrowFirstMission.title}</h3>
            <p>
              {model.tomorrowFirstMission.whenLabel}
              {model.tomorrowFirstMission.locationLabel
                ? ` · ${model.tomorrowFirstMission.locationLabel}`
                : ""}
            </p>
            <dl className="briefing-dl">
              <dt>Preparation</dt>
              <dd>
                {model.tomorrowFirstMission.preparationReadiness ??
                  "No preparation record exists."}
              </dd>
              <dt>Key message</dt>
              <dd>
                {model.tomorrowFirstMission.keyMessage ??
                  "No key message is available."}
              </dd>
              <dt>Departure</dt>
              <dd>
                {model.tomorrowFirstMission.departureLabel ??
                  "Departure time not set"}
              </dd>
              <dt>Travel duration</dt>
              <dd>
                {model.tomorrowFirstMission.durationMinutes != null
                  ? `${model.tomorrowFirstMission.durationMinutes} minutes`
                  : "No travel duration is stored."}
              </dd>
            </dl>
            {model.tomorrowFirstMission.gaps.length > 0 ? (
              <ul>
                {model.tomorrowFirstMission.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : null}
            <Link href={model.tomorrowFirstMission.href}>Open Prepare Mode</Link>
          </>
        )}
        {model.tomorrowConflicts.length > 0 ? (
          <div>
            <h3>Schedule review required</h3>
            <ul>
              {model.tomorrowConflicts.map((c) => (
                <li key={c.id}>{c.explanation}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="closeout-button-row">
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}`}
          >
            Open Tomorrow’s Briefing
          </Link>
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}/movement`}
          >
            Tomorrow Day Movement
          </Link>
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}/logistics`}
          >
            Tomorrow Day Logistics
          </Link>
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}/field-ops`}
          >
            Tomorrow Day Field Ops
          </Link>
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}/incidents`}
          >
            Tomorrow Day Incidents
          </Link>
          <Link
            className="button secondary"
            href={`/system/briefing/${addOne(model.campaignDate)}/launch`}
          >
            Tomorrow Morning Launch Review
          </Link>
        </p>
      </section>

      <section className="panel briefing-section" aria-labelledby="closeout-check-h">
        <h2 id="closeout-check-h">Final review checklist</h2>
        <ul className="briefing-list">
          {model.checklist.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong>: {c.stateLabel}
            </li>
          ))}
        </ul>
      </section>

      <CloseoutActions
        dateKey={model.campaignDate}
        expectedUpdatedAt={model.closeout.expectedUpdatedAt}
        reviewBlockers={model.reviewBlockers}
        signoffBlockers={model.signoffBlockers}
        status={model.closeout.status}
        exists={model.closeout.exists}
        closeoutSummary={model.closeout.closeoutSummary}
        tomorrowSummary={model.closeout.tomorrowSummary}
        carryForwardSummary={model.closeout.carryForwardSummary}
        internalNotes={model.closeout.internalNotes}
        todayAssessment={model.closeout.todayAssessment}
        tomorrowReadiness={model.closeout.tomorrowReadiness}
        suggested={model.suggestedCarryForward}
      />

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Isolation: Mission records are not
          mutated by Day Closeout · Signoff does not complete underlying work
        </p>
      </footer>
    </article>
  );
}

function addOne(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString().slice(0, 10);
}
