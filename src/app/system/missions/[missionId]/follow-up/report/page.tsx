import type { Metadata } from "next";
import Link from "next/link";
import {
  labelFollowUpActionStatus,
  labelFollowUpSource,
  labelFollowUpStatus,
  labelOutcomeAssessment,
  labelDebriefStatus,
} from "@/lib/missions/v21";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getFollowUpWorkspace } from "@/server/services/mission-follow-up-service";

export const metadata: Metadata = {
  title: "Mission Closeout Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ missionId: string }> };

export default async function FollowUpReportPage({ params }: Ctx) {
  const { missionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/missions/${missionId}/follow-up/report`,
  );
  const vm = await getFollowUpWorkspace(missionId, actor);
  const { mission, debrief, followUp, summary, completedActions, cancelledActions } =
    vm;

  return (
    <div className="page-stack follow-up-report">
      <header className="page-header">
        <p className="muted">Mission Closeout Report · Internal</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <span aria-hidden="true"> · </span>
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p className="muted">
          Follow-up: {labelFollowUpStatus(followUp.followUpStatus)}
          {debrief.status ? (
            <>
              <span aria-hidden="true"> · </span>
              Debrief: {labelDebriefStatus(debrief.status)}
            </>
          ) : null}
          {debrief.outcomeAssessment ? (
            <>
              <span aria-hidden="true"> · </span>
              Outcome: {labelOutcomeAssessment(debrief.outcomeAssessment)}
            </>
          ) : null}
        </p>
        <nav className="follow-up-nav" aria-label="Report navigation">
          <Link href={`/system/missions/${mission.missionId}/follow-up`}>
            Back to Follow-up
          </Link>
          <Link href={`/system/missions/${mission.missionId}`}>
            Mission record
          </Link>
        </nav>
      </header>

      <section className="panel">
        <h2>Objective</h2>
        <p>{mission.objective ?? "No projected objective."}</p>
        <p>
          <strong>Debrief outcome:</strong>{" "}
          {debrief.outcomeSummary ?? "No outcome summary."}
        </p>
      </section>

      <section className="panel">
        <h2>Accountability counts</h2>
        <p>
          {summary.completed} of {summary.total} approved follow-ups completed ·{" "}
          {summary.cancelled} cancelled · {summary.open + summary.inProgress}{" "}
          still active
        </p>
      </section>

      <section className="panel">
        <h2>Completed work</h2>
        {completedActions.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <ul>
            {completedActions.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> — {labelFollowUpActionStatus(a.status)}
                <div className="muted">{labelFollowUpSource(a.sourceType)}</div>
                {a.completionSummary ? (
                  <div>{a.completionSummary}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Cancelled work</h2>
        {cancelledActions.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <ul>
            {cancelledActions.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <div className="muted">
                  Reason: {a.cancellationReason ?? "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Closeout summary</h2>
        <p>{followUp.closeoutSummary ?? "No closeout summary."}</p>
        {followUp.unresolvedSummary ? (
          <p>
            <strong>Deferred / continuing:</strong> {followUp.unresolvedSummary}
          </p>
        ) : null}
      </section>

      <footer className="panel muted">
        <p>
          Started: {followUp.startedAt ?? "—"}
          <br />
          Closed: {followUp.closedAt ?? "—"}
          {followUp.closedByUserId
            ? ` · by ${followUp.closedByUserId}`
            : null}
        </p>
        <p>Print this page for an internal closeout copy.</p>
      </footer>
    </div>
  );
}
