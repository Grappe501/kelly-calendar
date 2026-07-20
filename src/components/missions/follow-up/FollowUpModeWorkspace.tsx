"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  labelDebriefStatus,
  labelFollowUpStatus,
  labelOutcomeAssessment,
  type MissionFollowUpActionViewModel,
  type MissionFollowUpViewModel,
} from "@/lib/missions/v21";

type Props = { initial: MissionFollowUpViewModel };
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function FollowUpModeWorkspace({ initial }: Props) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [closeoutSummary, setCloseoutSummary] = useState(
    initial.followUp.closeoutSummary ?? "",
  );
  const [unresolvedSummary, setUnresolvedSummary] = useState(
    initial.followUp.unresolvedSummary ?? "",
  );
  const [newTitle, setNewTitle] = useState("");
  const [completeNote, setCompleteNote] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});
  const statusId = useId();

  const { mission, debrief, followUp, summary, nextRequiredAction } = view;

  async function patch(section: string, payload: Record<string, unknown> = {}) {
    if (pending) return;
    setPending(true);
    setSaveStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/missions/${mission.missionId}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...payload }),
      });
      const json = (await res.json().catch(() => null)) as
        | (MissionFollowUpViewModel & {
            ok?: boolean;
            error?: { message?: string; code?: string };
          })
        | null;
      if (!res.ok || !json || json.ok === false) {
        throw new Error(
          json?.error?.message ??
            (res.status === 409
              ? "Another operator updated this record. Reload and retry."
              : `Save failed (${res.status}). Retry when connected.`),
        );
      }
      setView({
        mission: json.mission,
        debrief: json.debrief,
        followUp: json.followUp,
        summary: json.summary,
        nextRequiredAction: json.nextRequiredAction,
        commitments: json.commitments,
        relationshipActions: json.relationshipActions,
        unresolvedQuestions: json.unresolvedQuestions,
        otherActions: json.otherActions,
        blockedActions: json.blockedActions,
        waitingActions: json.waitingActions,
        completedActions: json.completedActions,
        cancelledActions: json.cancelledActions,
        closeoutChecklist: json.closeoutChecklist,
        importEligibleCount: json.importEligibleCount,
        lastImportResult: json.lastImportResult,
        isolation: json.isolation,
      });
      setCloseoutSummary(json.followUp.closeoutSummary ?? "");
      setUnresolvedSummary(json.followUp.unresolvedSummary ?? "");
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPending(false);
    }
  }

  const sticky =
    followUp.followUpStatus === "NOT_STARTED"
      ? {
          label:
            debrief.status === "APPROVED"
              ? "Import Approved Actions"
              : "Begin Follow-up",
          run: () =>
            void patch(
              debrief.status === "APPROVED" ? "import" : "start",
            ),
        }
      : followUp.followUpStatus === "ACTIVE"
        ? view.importEligibleCount > 0
          ? {
              label: "Import Approved Actions",
              run: () => void patch("import"),
            }
          : nextRequiredAction
            ? {
                label: `Next: ${nextRequiredAction.title.slice(0, 40)}`,
                run: () => {
                  document
                    .getElementById(`action-${nextRequiredAction.id}`)
                    ?.scrollIntoView({ behavior: "smooth" });
                },
              }
            : null
        : followUp.followUpStatus === "READY_TO_CLOSE"
          ? {
              label: "Close Mission",
              run: () => {
                if (
                  !window.confirm(
                    "Close this Mission? This does not change Event scheduling or lifecycle phase automatically.",
                  )
                ) {
                  return;
                }
                void patch("close", { closeoutSummary });
              },
            }
          : null;

  return (
    <div className="page-stack follow-up-mode">
      <header className="follow-up-header">
        <p className="muted">Follow-up Mode · Mission accountability</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <span aria-hidden="true"> · </span>
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p className="muted" aria-live="polite">
          Mission phase: {mission.lifecyclePhaseLabel}
          <span aria-hidden="true"> · </span>
          Follow-up: {labelFollowUpStatus(followUp.followUpStatus)}
          <span aria-hidden="true"> · </span>
          Debrief:{" "}
          {debrief.status ? labelDebriefStatus(debrief.status) : "None"}
          {debrief.outcomeAssessment ? (
            <>
              <span aria-hidden="true"> · </span>
              Outcome: {labelOutcomeAssessment(debrief.outcomeAssessment)}
            </>
          ) : null}
        </p>
        <p>
          <strong>
            {summary.open + summary.inProgress + summary.waiting + summary.blocked}{" "}
            open · {summary.dueToday} due today · {summary.blocked} blocked
          </strong>
          <span className="muted">
            {" "}
            · {summary.completed} of {summary.total} approved follow-ups completed
          </span>
        </p>
        <nav className="follow-up-nav" aria-label="Follow-up navigation">
          <Link href="/">Today’s Mission</Link>
          <Link href={`/system/missions/${mission.missionId}/prepare`}>
            Prepare
          </Link>
          <Link href={`/system/missions/${mission.missionId}/execute`}>
            Execute
          </Link>
          <Link href={`/system/missions/${mission.missionId}/debrief`}>
            Debrief
          </Link>
          <Link href={`/system/missions/${mission.missionId}`}>
            Full record
          </Link>
          {(followUp.followUpStatus === "READY_TO_CLOSE" ||
            followUp.followUpStatus === "CLOSED") && (
            <Link href={`/system/missions/${mission.missionId}/follow-up/report`}>
              Closeout report
            </Link>
          )}
        </nav>
        <p id={statusId} className="muted" role="status" aria-live="polite">
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved."
              : saveStatus === "error"
                ? error ?? "Save failed."
                : "Nothing enters the queue without a human decision."}
        </p>
      </header>

      {sticky ? (
        <div className="follow-up-sticky">
          <button
            type="button"
            className="button follow-up-primary-btn"
            disabled={pending}
            onClick={sticky.run}
          >
            {sticky.label}
          </button>
        </div>
      ) : null}

      {view.lastImportResult ? (
        <p className="panel" role="status">
          Import: {view.lastImportResult.imported} imported ·{" "}
          {view.lastImportResult.alreadyPresent} already present ·{" "}
          {view.lastImportResult.failed} failed
        </p>
      ) : null}

      <section className="panel" aria-labelledby="summary-heading">
        <h2 id="summary-heading">Accountability summary</h2>
        <ul className="follow-up-summary-grid">
          <li>Total {summary.total}</li>
          <li>Open {summary.open}</li>
          <li>In progress {summary.inProgress}</li>
          <li>Waiting {summary.waiting}</li>
          <li>Blocked {summary.blocked}</li>
          <li>Overdue {summary.overdue}</li>
          <li>Due today {summary.dueToday}</li>
          <li>Unassigned {summary.unassigned}</li>
          <li>Completed {summary.completed}</li>
          <li>Cancelled {summary.cancelled}</li>
        </ul>
        {debrief.status !== "APPROVED" ? (
          <p className="muted">
            Official import requires an approved Debrief. Current Debrief:{" "}
            {debrief.status ? labelDebriefStatus(debrief.status) : "missing"}.
          </p>
        ) : (
          <button
            type="button"
            className="button"
            disabled={pending || view.importEligibleCount === 0}
            onClick={() => void patch("import")}
          >
            Build Follow-up Queue
            {view.importEligibleCount
              ? ` (${view.importEligibleCount} eligible)`
              : " (none pending)"}
          </button>
        )}
      </section>

      {nextRequiredAction ? (
        <section className="panel follow-up-next" aria-labelledby="next-heading">
          <h2 id="next-heading">Next required action</h2>
          <ActionCard
            action={nextRequiredAction}
            pending={pending}
            completeNote={completeNote[nextRequiredAction.id] ?? ""}
            cancelReason={cancelReason[nextRequiredAction.id] ?? ""}
            onCompleteNote={(v) =>
              setCompleteNote((m) => ({ ...m, [nextRequiredAction.id]: v }))
            }
            onCancelReason={(v) =>
              setCancelReason((m) => ({ ...m, [nextRequiredAction.id]: v }))
            }
            onPatch={patch}
          />
        </section>
      ) : (
        <section className="panel">
          <h2>Next required action</h2>
          <p className="muted">No open follow-up action is waiting.</p>
        </section>
      )}

      <ActionGroup
        title="Open commitments"
        actions={view.commitments.filter(
          (a) => a.status !== "COMPLETED" && a.status !== "CANCELLED",
        )}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Relationship follow-ups"
        actions={view.relationshipActions.filter(
          (a) => a.status !== "COMPLETED" && a.status !== "CANCELLED",
        )}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Unresolved questions"
        actions={view.unresolvedQuestions.filter(
          (a) => a.status !== "COMPLETED" && a.status !== "CANCELLED",
        )}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Other approved actions"
        actions={view.otherActions}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Blocked"
        actions={view.blockedActions}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Waiting"
        actions={view.waitingActions}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
      />
      <ActionGroup
        title="Completed"
        actions={view.completedActions}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
        readOnly
      />
      <ActionGroup
        title="Cancelled"
        actions={view.cancelledActions}
        pending={pending}
        completeNote={completeNote}
        cancelReason={cancelReason}
        setCompleteNote={setCompleteNote}
        setCancelReason={setCancelReason}
        onPatch={patch}
        readOnly
      />

      <section className="panel" aria-labelledby="add-heading">
        <h2 id="add-heading">Operator-added action</h2>
        <p className="muted">
          Add only work required to close this Mission or honor a commitment
          created by it.
        </p>
        <label className="field">
          <span className="field-label">Title</span>
          <input
            type="text"
            value={newTitle}
            disabled={pending}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={pending || !newTitle.trim()}
          onClick={() => {
            const title = newTitle.trim();
            if (!title) return;
            setNewTitle("");
            void patch("addAction", { action: { title } });
          }}
        >
          Add action
        </button>
      </section>

      <section className="panel" aria-labelledby="closeout-heading">
        <h2 id="closeout-heading">Mission closeout</h2>
        <ul className="follow-up-checklist">
          {view.closeoutChecklist.map((c) => (
            <li key={c.id}>
              <span aria-hidden="true">{c.ok ? "✓" : "○"} </span>
              {c.label}
              <span className="visually-hidden">
                {c.ok ? " complete" : " incomplete"}
              </span>
            </li>
          ))}
        </ul>
        <label className="field">
          <span className="field-label">Closeout summary</span>
          <textarea
            rows={4}
            value={closeoutSummary}
            disabled={pending}
            onChange={(e) => setCloseoutSummary(e.target.value)}
            placeholder="Explain why this Mission can be closed and identify any work transferred to another owner or system."
          />
        </label>
        <label className="field">
          <span className="field-label">Deferred / continuing responsibility</span>
          <textarea
            rows={3}
            value={unresolvedSummary}
            disabled={pending}
            onChange={(e) => setUnresolvedSummary(e.target.value)}
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() =>
              void patch("notes", {
                closeoutSummary,
                unresolvedSummary,
              })
            }
          >
            Save closeout notes
          </button>
          {followUp.followUpStatus === "ACTIVE" ? (
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                void patch("readyToClose", {
                  closeoutSummary,
                  unresolvedSummary,
                })
              }
            >
              Mark Ready to Close
            </button>
          ) : null}
          {followUp.followUpStatus === "READY_TO_CLOSE" ? (
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Close this Mission? Event scheduling and lifecycle phase are not auto-changed.",
                  )
                ) {
                  return;
                }
                void patch("close", { closeoutSummary, unresolvedSummary });
              }}
            >
              Close Mission
            </button>
          ) : null}
        </div>
        {followUp.followUpStatus === "CLOSED" ? (
          <p role="status">
            Mission Follow-up closed
            {followUp.closedAt ? ` at ${followUp.closedAt}` : ""}. Lifecycle phase
            remains operator/projection-driven and was not silently rewritten.
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ActionGroup({
  title,
  actions,
  pending,
  completeNote,
  cancelReason,
  setCompleteNote,
  setCancelReason,
  onPatch,
  readOnly,
}: {
  title: string;
  actions: MissionFollowUpActionViewModel[];
  pending: boolean;
  completeNote: Record<string, string>;
  cancelReason: Record<string, string>;
  setCompleteNote: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCancelReason: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onPatch: (section: string, payload?: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const headingId = useId();
  if (!actions.length) return null;
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <ul className="follow-up-card-list">
        {actions.map((action) => (
          <li key={action.id}>
            <ActionCard
              action={action}
              pending={pending}
              completeNote={completeNote[action.id] ?? ""}
              cancelReason={cancelReason[action.id] ?? ""}
              onCompleteNote={(v) =>
                setCompleteNote((m) => ({ ...m, [action.id]: v }))
              }
              onCancelReason={(v) =>
                setCancelReason((m) => ({ ...m, [action.id]: v }))
              }
              onPatch={onPatch}
              readOnly={readOnly}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionCard({
  action,
  pending,
  completeNote,
  cancelReason,
  onCompleteNote,
  onCancelReason,
  onPatch,
  readOnly,
}: {
  action: MissionFollowUpActionViewModel;
  pending: boolean;
  completeNote: string;
  cancelReason: string;
  onCompleteNote: (v: string) => void;
  onCancelReason: (v: string) => void;
  onPatch: (section: string, payload?: Record<string, unknown>) => void;
  readOnly?: boolean;
}) {
  const [ownerName, setOwnerName] = useState(action.ownerName ?? "");
  const [dueAt, setDueAt] = useState(action.dueAt?.slice(0, 10) ?? "");

  return (
    <article id={`action-${action.id}`} className="follow-up-card">
      <h3>{action.title}</h3>
      <p className="muted">
        {action.sourceLabel}
        <span aria-hidden="true"> · </span>
        {action.statusLabel}
        <span aria-hidden="true"> · </span>
        {action.priorityLabel}
        <span aria-hidden="true"> · </span>
        {action.ownerLabel}
        <span aria-hidden="true"> · </span>
        {action.dueLabel}
        {action.isOverdue ? " · Overdue" : null}
      </p>
      {action.description ? <p>{action.description}</p> : null}
      {action.relatedPersonName ? (
        <p className="muted">Person: {action.relatedPersonName}</p>
      ) : null}
      {action.relatedOrganizationName ? (
        <p className="muted">Organization: {action.relatedOrganizationName}</p>
      ) : null}
      {action.blockedReason ? (
        <p>
          <strong>Blocked:</strong> {action.blockedReason}
        </p>
      ) : null}
      {action.waitingReason ? (
        <p>
          <strong>Waiting:</strong> {action.waitingReason}
          {action.nextCheckAt ? ` · Check again ${action.nextCheckAt}` : ""}
        </p>
      ) : null}
      {action.completionSummary ? (
        <p>
          <strong>Completed:</strong> {action.completionSummary}
        </p>
      ) : null}
      {action.cancellationReason ? (
        <p>
          <strong>Cancelled:</strong> {action.cancellationReason}
        </p>
      ) : null}

      {!readOnly &&
      action.status !== "COMPLETED" &&
      action.status !== "CANCELLED" ? (
        <>
          <label className="field">
            <span className="field-label">Owner name</span>
            <input
              type="text"
              value={ownerName}
              disabled={pending}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Due date</span>
            <input
              type="date"
              value={dueAt}
              disabled={pending}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                void onPatch("updateAction", {
                  action: {
                    id: action.id,
                    expectedUpdatedAt: action.updatedAt,
                    ownerName: ownerName || null,
                    ownerType: ownerName.trim() ? "EXTERNAL" : "UNASSIGNED",
                    dueAt: dueAt
                      ? new Date(`${dueAt}T12:00:00`).toISOString()
                      : null,
                  },
                })
              }
            >
              Save owner / due
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                void onPatch("updateAction", {
                  action: {
                    id: action.id,
                    expectedUpdatedAt: action.updatedAt,
                    status: "IN_PROGRESS",
                  },
                })
              }
            >
              Mark in progress
            </button>
          </div>
          <label className="field">
            <span className="field-label">Completion summary / evidence note</span>
            <textarea
              rows={2}
              value={completeNote}
              disabled={pending}
              onChange={(e) => onCompleteNote(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={pending || !completeNote.trim()}
            onClick={() =>
              void onPatch("completeAction", {
                action: {
                  id: action.id,
                  expectedUpdatedAt: action.updatedAt,
                  completionSummary: completeNote,
                },
                evidenceNote: completeNote,
                evidenceType: "NOTE",
              })
            }
          >
            Complete action
          </button>
          <label className="field">
            <span className="field-label">Cancellation reason</span>
            <input
              type="text"
              value={cancelReason}
              disabled={pending}
              onChange={(e) => onCancelReason(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={pending || !cancelReason.trim()}
            onClick={() =>
              void onPatch("cancelAction", {
                action: {
                  id: action.id,
                  expectedUpdatedAt: action.updatedAt,
                },
                cancellationReason: cancelReason,
              })
            }
          >
            Cancel action
          </button>
        </>
      ) : null}
    </article>
  );
}
