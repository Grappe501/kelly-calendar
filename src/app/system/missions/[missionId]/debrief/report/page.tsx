import type { Metadata } from "next";
import Link from "next/link";
import {
  labelCriterionAssessment,
  labelDebriefStatus,
  labelOrganizationResult,
  labelOutcomeAssessment,
  labelRelationshipOutcome,
} from "@/lib/missions/v21/debrief";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getDebriefWorkspace } from "@/server/services/mission-debrief-service";

export const metadata: Metadata = {
  title: "After-Action Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function DebriefReportPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/debrief/report`,
  );
  const vm = await getDebriefWorkspace(missionId, actor);
  const { mission, preparation, execution, debrief } = vm;

  return (
    <div className="page-stack debrief-report">
      <header className="page-header debrief-report-header">
        <p className="muted">After-Action Report · Internal</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <span aria-hidden="true"> · </span>
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p className="muted">
          Debrief: {labelDebriefStatus(debrief.debriefStatus)}
          <span aria-hidden="true"> · </span>
          Outcome: {labelOutcomeAssessment(debrief.outcomeAssessment)}
        </p>
        <nav className="debrief-mode-nav" aria-label="Report navigation">
          <Link href={`/system/missions/${mission.missionId}/debrief`}>
            Back to Debrief
          </Link>
          <Link href={`/system/missions/${mission.missionId}`}>
            Mission record
          </Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="aar-objective">
        <h2 id="aar-objective">Objective</h2>
        <p>{mission.objective ?? "No projected objective."}</p>
        <p>
          <strong>Strategic purpose:</strong>{" "}
          {preparation.strategicPurpose ?? "Not prepared."}
        </p>
        <p>
          <strong>Key message:</strong> {preparation.keyMessage ?? "Not prepared."}
        </p>
      </section>

      <section className="panel" aria-labelledby="aar-outcome">
        <h2 id="aar-outcome">Outcome</h2>
        <p>
          <strong>{labelOutcomeAssessment(debrief.outcomeAssessment)}</strong>
        </p>
        <p>{debrief.outcomeSummary ?? "No outcome summary."}</p>
      </section>

      <section className="panel" aria-labelledby="aar-criteria">
        <h2 id="aar-criteria">Success criteria</h2>
        {debrief.criterionAssessments.length === 0 ? (
          <p className="muted">No success criteria were defined for this Mission.</p>
        ) : (
          <ul>
            {debrief.criterionAssessments.map((c) => (
              <li key={c.id}>
                <strong>{c.criterionText}</strong> —{" "}
                {labelCriterionAssessment(c.assessment)}
                {c.evidence ? <div className="muted">{c.evidence}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-people">
        <h2 id="aar-people">People outcomes</h2>
        {debrief.peopleOutcomes.length === 0 ? (
          <p className="muted">No people outcomes recorded.</p>
        ) : (
          <ul>
            {debrief.peopleOutcomes.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> —{" "}
                {labelRelationshipOutcome(p.relationshipOutcome)}
                {p.recommendedNextStep ? (
                  <div className="muted">Next: {p.recommendedNextStep}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-orgs">
        <h2 id="aar-orgs">Organization outcomes</h2>
        {debrief.organizationOutcomes.length === 0 ? (
          <p className="muted">No organization outcomes recorded.</p>
        ) : (
          <ul>
            {debrief.organizationOutcomes.map((o) => (
              <li key={o.id}>
                <strong>{o.name}</strong> — {labelOrganizationResult(o.result)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-commitments">
        <h2 id="aar-commitments">Commitments</h2>
        {debrief.commitmentReviews.length === 0 ? (
          <p className="muted">
            {execution.commitments.length
              ? "Commitments not yet reviewed in Debrief."
              : "No commitments were captured in Execute Mode."}
          </p>
        ) : (
          <ul>
            {debrief.commitmentReviews.map((c) => (
              <li key={c.id}>
                {c.originalText}
                {c.clarification ? (
                  <div className="muted">Clarification: {c.clarification}</div>
                ) : null}
                <div className="muted">
                  {c.approvedForFollowUp ? "Approved for Follow-up" : "Not approved for Follow-up"}
                  {c.resolved ? " · Resolved" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-followups">
        <h2 id="aar-followups">Unresolved follow-ups</h2>
        {debrief.followUpReviews.filter((f) => !f.resolved).length === 0 ? (
          <p className="muted">No unresolved follow-ups in Debrief review.</p>
        ) : (
          <ul>
            {debrief.followUpReviews
              .filter((f) => !f.resolved)
              .map((f) => (
                <li key={f.id}>
                  {f.originalText}
                  {f.approvedForFollowUp ? (
                    <span className="muted"> · Approved for Follow-up</span>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-worked">
        <h2 id="aar-worked">What worked</h2>
        {debrief.whatWorked.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul>
            {debrief.whatWorked.map((w) => (
              <li key={w.id}>{w.statement}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-not">
        <h2 id="aar-not">What did not work</h2>
        {debrief.whatDidNotWork.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul>
            {debrief.whatDidNotWork.map((w) => (
              <li key={w.id}>{w.statement}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-lessons">
        <h2 id="aar-lessons">Lessons learned</h2>
        {debrief.lessonsLearned.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul>
            {debrief.lessonsLearned.map((l) => (
              <li key={l.id}>
                <strong>{l.statement}</strong>
                {l.recommendedChange ? (
                  <div className="muted">Change: {l.recommendedChange}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-insights">
        <h2 id="aar-insights">Strategic insights</h2>
        {debrief.strategicInsights.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul>
            {debrief.strategicInsights.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="aar-actions">
        <h2 id="aar-actions">Recommended next actions</h2>
        {debrief.recommendedNextSteps.length === 0 ? (
          <p className="muted">None recorded.</p>
        ) : (
          <ul>
            {debrief.recommendedNextSteps.map((a) => (
              <li key={a.id}>
                {a.text}
                {a.owner ? <span className="muted"> · Owner: {a.owner}</span> : null}
                {a.approvedForFollowUp ? (
                  <span className="muted"> · Approved for Follow-up</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="panel muted">
        <p>
          Completed: {debrief.completedAt ?? "—"}
          <br />
          Approved: {debrief.approvedAt ?? "—"}
          {debrief.approvedByUserId
            ? ` · by ${debrief.approvedByUserId}`
            : null}
        </p>
        <p>Print this page for an internal campaign after-action copy.</p>
      </footer>
    </div>
  );
}
