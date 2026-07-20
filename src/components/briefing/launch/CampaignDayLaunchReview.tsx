import Link from "next/link";
import { LaunchActions } from "@/components/briefing/launch/LaunchActions";
import type { CampaignDayLaunchReviewViewModel } from "@/lib/missions/v21/day-launch";

type Props = { model: CampaignDayLaunchReviewViewModel };

export function CampaignDayLaunchReview({ model }: Props) {
  return (
    <article className="page-stack campaign-day-launch">
      <header className="briefing-header">
        <h1>Morning Launch Review</h1>
        <p className="executive-question">
          Review overnight changes, confirm the first Mission, and clear the
          campaign to begin.
        </p>
        <p className="briefing-date-line">{model.closingHeading}</p>
        <p className="muted">
          {model.timezone} · Status:{" "}
          <strong>{model.launchReview.statusLabel}</strong> · Readiness:{" "}
          {model.launchReview.readinessAssessmentLabel}
          {model.launchReview.derivedReadiness !==
          model.launchReview.readinessAssessment
            ? ` (derived: ${model.launchReview.derivedReadinessLabel})`
            : ""}
        </p>
        {model.historicalNotice ? (
          <p className="briefing-disclaimer" role="note">
            {model.historicalNotice}
          </p>
        ) : null}
        <nav className="briefing-nav" aria-label="Launch navigation">
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.briefingHref}>Day Briefing</Link>
          <Link href={model.navigation.closeoutHref}>Prior Closeout</Link>
          <Link href={model.navigation.todaysMissionHref}>Today’s Mission</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={`/system/briefing/${model.campaignDate}/movement`}>
            Day Movement
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/logistics`}>
            Day Logistics
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/staffing`}>
            Day Staffing
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/incidents`}>
            Day Incidents
          </Link>
          <Link href={model.navigation.exceptionsHref}>Exception Digest</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel briefing-section" aria-labelledby="launch-sum-h">
        <h2 id="launch-sum-h">Launch summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions today</li>
          <li>
            First Mission: {model.summary.firstMissionTitle ?? "None"} ·{" "}
            {model.summary.firstMissionTime ?? "—"}
          </li>
          <li>
            Primary Mission: {model.summary.primaryMissionTitle ?? "None"}
          </li>
          <li>
            Leave by:{" "}
            {model.summary.firstDepartureTime ?? "Departure time not set"}
          </li>
          <li>{model.summary.overnightChangeCount} overnight changes</li>
          <li>{model.summary.urgentCarryForwardCount} urgent carry-forward</li>
          <li>{model.summary.blockingConditionCount} blockers</li>
          <li>
            Exception digest qualified: {model.exceptionDigest.qualifiedCount}{" "}
            (high/critical {model.exceptionDigest.highCriticalCount})
          </li>
          <li>{model.summary.dueBeforeLaunchCount} due before launch</li>
          <li>{model.summary.unacknowledgedCount} unacknowledged</li>
        </ul>
        {model.summary.missionCount === 0 ? (
          <p>
            No Missions are scheduled today. Campaign responsibility may still
            remain in follow-up, approvals, and preparation for the next Mission.
          </p>
        ) : null}
      </section>

      {model.blockingConditions.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="launch-block-h">
          <h2 id="launch-block-h">Blocking conditions</h2>
          <ul className="briefing-list">
            {model.blockingConditions.map((b) => (
              <li key={b.id}>
                <h3>{b.title}</h3>
                <p>{b.explanation}</p>
                <p className="muted">
                  Ack: {b.acknowledgementStatus ?? "OPEN"}
                </p>
                {b.href ? <Link href={b.href}>Open workspace</Link> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel briefing-section" aria-labelledby="launch-digest-h">
        <h2 id="launch-digest-h">Overnight exception digest</h2>
        <p>
          Qualified overnight / carry-forward incidents from the prior campaign
          day: {model.exceptionDigest.qualifiedCount} (overnight{" "}
          {model.exceptionDigest.overnightCount}, carry-forward{" "}
          {model.exceptionDigest.carryForwardCount}).
        </p>
        <p>
          <Link href={model.exceptionDigest.href}>Open Exception Digest</Link>
          {" · "}
          <Link href={model.navigation.incidentsHref}>Day Incidents</Link>
        </p>
        <p className="muted">
          Completing Morning Review or launching the day does not complete
          Exception Digest review or resolve incidents. ACKNOWLEDGED does not
          clear blockers.
        </p>
      </section>

      {model.departureReview ? (
        <section className="panel briefing-section" aria-labelledby="launch-dep-h">
          <h2 id="launch-dep-h">First departure and travel</h2>
          <p>
            <strong>{model.departureReview.stateLabel}</strong> ·{" "}
            {model.departureReview.missionTitle}
          </p>
          <dl className="briefing-dl">
            <dt>Destination</dt>
            <dd>
              {model.departureReview.destinationLabel ??
                "No destination detail is stored."}
            </dd>
            <dt>Departure</dt>
            <dd>
              {model.departureReview.departureLabel ?? "Departure time not set"}
            </dd>
            <dt>Arrival target</dt>
            <dd>
              {model.departureReview.arrivalTargetLabel ??
                "No arrival target is stored."}
            </dd>
            <dt>Travel duration</dt>
            <dd>
              {model.departureReview.durationMinutes != null
                ? `${model.departureReview.durationMinutes} minutes`
                : "No travel duration is stored."}
            </dd>
          </dl>
          <Link href={model.departureReview.href}>Open Prepare Mode</Link>
        </section>
      ) : null}

      <section className="panel briefing-section" aria-labelledby="launch-first-h">
        <h2 id="launch-first-h">First Mission</h2>
        {!model.firstMission ? (
          <p className="muted">No primary Mission is selected for today.</p>
        ) : (
          <>
            <h3>{model.firstMission.title}</h3>
            <p className="muted">
              {model.firstMission.whenLabel}
              {model.firstMission.locationLabel
                ? ` · ${model.firstMission.locationLabel}`
                : ""}
            </p>
            <dl className="briefing-dl">
              <dt>Key message</dt>
              <dd>
                {model.firstMission.keyMessage ?? "No key message is available."}
              </dd>
              <dt>Objective</dt>
              <dd>{model.firstMission.objective ?? "No objective is stored."}</dd>
            </dl>
            {model.primaryMission &&
            model.primaryMission.missionId !== model.firstMission.missionId ? (
              <p>
                Primary Mission (selector): {model.primaryMission.title}
              </p>
            ) : null}
            <Link href={model.firstMission.href}>Open Mission workspace</Link>
            {" · "}
            <Link href={`/system/missions/${model.firstMission.missionId}/travel`}>
              Open Travel
            </Link>
          </>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="launch-prior-h">
        <h2 id="launch-prior-h">Prior day Closeout</h2>
        {!model.priorCloseout.exists ? (
          <p>The prior campaign day was not formally closed out.</p>
        ) : (
          <>
            <p>
              {model.priorCloseout.dateKey} · {model.priorCloseout.statusLabel} ·
              Tomorrow readiness last night:{" "}
              {model.priorCloseout.tomorrowReadinessLabel}
            </p>
            <p className="muted">{model.priorCloseout.baselineLabel}</p>
            <p>
              {model.priorCloseout.summary || "No closeout summary entered."}
            </p>
            <Link href={model.priorCloseout.href}>Open prior Closeout</Link>
          </>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="launch-on-h">
        <h2 id="launch-on-h">Overnight changes</h2>
        {model.overnightChanges.length === 0 ? (
          <p className="muted">
            No reliable overnight changes were detected from current records.
          </p>
        ) : (
          <ul className="briefing-list">
            {model.overnightChanges.map((c) => (
              <li key={c.id}>
                <h3>
                  {c.categoryLabel}: {c.title}
                </h3>
                <p className="muted">
                  {c.severityLabel}
                  {c.previousValue ? ` · was: ${c.previousValue}` : ""}
                  {c.currentValue ? ` · now: ${c.currentValue}` : ""}
                </p>
                <p>Ack: {c.acknowledgementStatus ?? "OPEN"}</p>
                {c.href ? <Link href={c.href}>Open</Link> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="launch-cf-h">
        <h2 id="launch-cf-h">Urgent carry-forward</h2>
        {model.urgentCarryForward.length === 0 ? (
          <p className="muted">No urgent carry-forward items from prior Closeout.</p>
        ) : (
          <ul className="briefing-list">
            {model.urgentCarryForward.map((c) => (
              <li key={c.id}>
                <h3>{c.title}</h3>
                <p className="muted">
                  {c.ownerLabel} · {c.status}
                  {c.targetDateKey ? ` · target ${c.targetDateKey}` : ""}
                </p>
                <Link href={c.href}>Open destination</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {model.preparationReview ? (
        <section className="panel briefing-section" aria-labelledby="launch-prep-h">
          <h2 id="launch-prep-h">First Mission preparation</h2>
          <p>
            Impact: <strong>{model.preparationReview.impactLabel}</strong>
          </p>
          <p>{model.peopleReadiness.label}</p>
          <p>{model.organizationReadiness.label}</p>
          <p>Materials: {model.materialsReadiness.stateLabel}</p>
          {model.preparationReview.gaps.length > 0 ? (
            <ul>
              {model.preparationReview.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : null}
          <Link href={model.preparationReview.href}>Open Prepare Mode</Link>
        </section>
      ) : null}

      <section className="panel briefing-section" aria-labelledby="launch-due-h">
        <h2 id="launch-due-h">Due before launch</h2>
        {model.dueBeforeLaunch.length === 0 ? (
          <p className="muted">No due-before-launch items.</p>
        ) : (
          <ul className="briefing-list">
            {model.dueBeforeLaunch.map((a) => (
              <li key={a.id}>
                <h3>{a.title}</h3>
                <p className="muted">
                  {a.ownerLabel} · {a.dueLabel} · {a.priority}
                </p>
                <Link href={a.href}>Open Follow-up</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="launch-lead-h">
        <h2 id="launch-lead-h">Leadership decisions</h2>
        {model.leadershipDecisions.length === 0 ? (
          <p className="muted">No launch-blocking leadership decisions detected.</p>
        ) : (
          <ul className="briefing-list">
            {model.leadershipDecisions.map((d) => (
              <li key={d.id}>
                <h3>{d.label}</h3>
                <p>{d.explanation}</p>
                <p className="muted">{d.requiredPermission}</p>
                <Link href={d.href}>Open workspace</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel briefing-section" aria-labelledby="launch-sched-h">
        <h2 id="launch-sched-h">Schedule review</h2>
        {model.scheduleReview.length === 0 ? (
          <p className="muted">No schedule conflicts detected for today.</p>
        ) : (
          <ul className="briefing-list">
            {model.scheduleReview.map((s) => (
              <li key={s.id}>
                <h3>{s.title}</h3>
                <p>
                  {s.severityLabel}: {s.explanation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {model.acceptedRisks.length > 0 ? (
        <section className="panel briefing-section" aria-labelledby="launch-risk-h">
          <h2 id="launch-risk-h">Accepted risks</h2>
          <p className="muted">
            Accepted risk records leadership’s decision to begin despite unresolved
            conditions. Underlying Mission work is not marked complete.
          </p>
          <ul className="briefing-list">
            {model.acceptedRisks.map((r) => (
              <li key={r.id}>
                <h3>{r.title}</h3>
                <p>{r.reason}</p>
                <p className="muted">
                  {r.acknowledgedByUserId ?? "Unknown actor"}
                  {r.acknowledgedAt ? ` · ${r.acknowledgedAt}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel briefing-section" aria-labelledby="launch-check-h">
        <h2 id="launch-check-h">Final launch checklist</h2>
        <ul className="briefing-list">
          {model.checklist.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong>: {c.stateLabel}
            </li>
          ))}
        </ul>
      </section>

      <LaunchActions
        dateKey={model.campaignDate}
        expectedUpdatedAt={model.launchReview.expectedUpdatedAt}
        status={model.launchReview.status}
        exists={model.launchReview.exists}
        reviewBlockers={model.reviewBlockers}
        launchBlockers={model.launchBlockers}
        launchSummary={model.launchReview.launchSummary}
        overnightChangeNotes={model.launchReview.overnightChangeNotes}
        acceptedRiskSummary={model.launchReview.acceptedRiskSummary}
        internalNotes={model.launchReview.internalNotes}
        readinessAssessment={model.launchReview.readinessAssessment}
        overnightChanges={model.overnightChanges}
        blockingConditions={model.blockingConditions}
      />

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Launch does not start Mission execution
          · Mission records are not mutated here
        </p>
      </footer>
    </article>
  );
}
