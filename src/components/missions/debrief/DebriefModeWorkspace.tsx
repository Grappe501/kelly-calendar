"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  labelCriterionAssessment,
  labelDebriefStatus,
  labelOrganizationResult,
  labelOutcomeAssessment,
  labelRelationshipOutcome,
  OUTCOME_ASSESSMENTS,
  CRITERION_ASSESSMENTS,
  RELATIONSHIP_OUTCOMES,
  ORGANIZATION_RESULTS,
  type MissionDebriefViewModel,
  type MissionOutcomeAssessment,
  type CriterionAssessmentValue,
  type RelationshipOutcomeValue,
  type OrganizationResultValue,
  type MissionLessonItem,
  type MissionLesson,
  type MissionStrategicInsight,
  type MissionUnresolvedQuestion,
  type MissionDebriefAction,
} from "@/lib/missions/v21/debrief";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation";
import { labelExecutionStatus } from "@/lib/missions/v21/execution";

type Props = { initial: MissionDebriefViewModel };

type SaveStatus = "idle" | "saving" | "saved" | "error";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DebriefModeWorkspace({ initial }: Props) {
  const [view, setView] = useState(initial);
  const [pending, setPending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const statusId = useId();

  const { mission, preparation, execution, debrief, checklist, presentationSummary } =
    view;

  async function patch(section: string, payload: Record<string, unknown> = {}) {
    if (pending) return;
    setPending(true);
    setSaveStatus("saving");
    setError(null);
    try {
      const res = await fetch(`/api/missions/${mission.missionId}/debrief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...payload }),
      });
      const json = (await res.json().catch(() => null)) as
        | (MissionDebriefViewModel & { ok?: boolean; error?: { message?: string } })
        | null;
      if (!res.ok || !json || json.ok === false) {
        throw new Error(
          json?.error?.message ?? `Save failed (${res.status}). Retry when connected.`,
        );
      }
      setView({
        mission: json.mission,
        preparation: json.preparation,
        execution: json.execution,
        debrief: json.debrief,
        checklist: json.checklist,
        presentationSummary: json.presentationSummary,
        isolation: json.isolation,
      });
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPending(false);
    }
  }

  const stickyLabel =
    debrief.debriefStatus === "NOT_STARTED"
      ? "Begin Debrief"
      : debrief.debriefStatus === "IN_PROGRESS"
        ? "Save & continue"
        : debrief.debriefStatus === "COMPLETED"
          ? "Approve Debrief"
          : null;

  return (
    <div className="page-stack debrief-mode">
      <header className="debrief-mode-header">
        <p className="muted">Debrief Mode · After-action review</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <span aria-hidden="true"> · </span>
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p className="muted" aria-live="polite">
          Mission phase: {mission.lifecyclePhaseLabel}
          <span aria-hidden="true"> · </span>
          Debrief: {labelDebriefStatus(debrief.debriefStatus)}
          <span aria-hidden="true"> · </span>
          Outcome: {labelOutcomeAssessment(debrief.outcomeAssessment)}
          <span aria-hidden="true"> · </span>
          Prep:{" "}
          {preparation.readiness
            ? labelPreparationReadiness(preparation.readiness)
            : "No brief"}
          <span aria-hidden="true"> · </span>
          Execute:{" "}
          {execution.status
            ? labelExecutionStatus(execution.status)
            : "No execution record"}
        </p>
        <nav className="debrief-mode-nav" aria-label="Debrief navigation">
          <Link href="/">Today’s Mission</Link>
          <Link href={`/system/missions/${mission.missionId}/prepare`}>
            Prepare
          </Link>
          <Link href={`/system/missions/${mission.missionId}/execute`}>
            Execute
          </Link>
          <Link href={`/system/missions/${mission.missionId}`}>
            Full record
          </Link>
          {(debrief.debriefStatus === "COMPLETED" ||
            debrief.debriefStatus === "APPROVED") && (
            <Link href={`/system/missions/${mission.missionId}/debrief/report`}>
              After-Action Report
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
                : `Summary: ${presentationSummary}`}
        </p>
      </header>

      {stickyLabel ? (
        <div className="debrief-sticky-action">
          <button
            type="button"
            className="button debrief-primary-btn"
            disabled={pending}
            onClick={() => {
              if (debrief.debriefStatus === "NOT_STARTED") {
                void patch("start");
              } else if (debrief.debriefStatus === "COMPLETED") {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    "Approve this After-Action Review as the official Mission Debrief?",
                  )
                ) {
                  return;
                }
                void patch("approve");
              } else {
                void patch("outcome", {
                  outcomeAssessment: debrief.outcomeAssessment,
                  outcomeSummary: debrief.outcomeSummary,
                });
              }
            }}
          >
            {stickyLabel}
          </button>
        </div>
      ) : null}

      <section className="panel" aria-labelledby="checklist-heading">
        <h2 id="checklist-heading">Readiness checklist</h2>
        <ul className="debrief-checklist">
          {checklist.map((c) => (
            <li key={c.id}>
              <span aria-hidden="true">{c.ok ? "✓" : "○"} </span>
              {c.label}
              <span className="visually-hidden">
                {c.ok ? " complete" : " incomplete"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="planned-heading">
        <h2 id="planned-heading">Planned versus actual</h2>
        <div className="debrief-compare">
          <div>
            <h3>Planned</h3>
            <p>
              <strong>Objective:</strong> {mission.objective ?? "Not projected."}
            </p>
            <p>
              <strong>Strategic purpose:</strong>{" "}
              {preparation.strategicPurpose ??
                "The Mission Brief did not set a strategic purpose."}
            </p>
            <p>
              <strong>Key message:</strong>{" "}
              {preparation.keyMessage ?? "No key message has been prepared."}
            </p>
            <p>
              <strong>People to find:</strong>{" "}
              {preparation.people.length
                ? preparation.people.map((p) => p.name).join(", ")
                : "The Mission Brief did not identify people to find."}
            </p>
            <p>
              <strong>Organizations:</strong>{" "}
              {preparation.organizations.length
                ? preparation.organizations.map((o) => o.name).join(", ")
                : "No organizations identified in Prepare Mode."}
            </p>
          </div>
          <div>
            <h3>Actual</h3>
            {!execution.exists ? (
              <p className="muted">
                No Execute Mode record exists for this Mission.
              </p>
            ) : (
              <>
                <p>
                  <strong>Arrival:</strong> {execution.arrivedAt ?? "Not marked"}
                </p>
                <p>
                  <strong>Started:</strong> {execution.startedAt ?? "Not marked"}
                </p>
                <p>
                  <strong>Ended:</strong>{" "}
                  {execution.endedAt ??
                    "The active Mission was not marked complete in Execute Mode."}
                </p>
                <p>
                  <strong>Observations:</strong>{" "}
                  {execution.observations.length
                    ? `${execution.observations.length} captured`
                    : "No execution observations were captured."}
                </p>
                <p>
                  <strong>Commitments:</strong> {execution.commitments.length}
                </p>
                <p>
                  <strong>Follow-ups:</strong>{" "}
                  {execution.immediateFollowUps.length}
                </p>
                {execution.fieldNotes ? (
                  <p>
                    <strong>Field notes:</strong> {execution.fieldNotes}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
        <p className="muted">
          Edit Prepare or Execute in their canonical workspaces — Debrief does not
          own those records.
        </p>
      </section>

      <OutcomeSection
        debrief={debrief}
        pending={pending}
        onChange={(outcomeAssessment, outcomeSummary) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, outcomeAssessment, outcomeSummary },
          }))
        }
        onSave={() =>
          void patch("outcome", {
            outcomeAssessment: debrief.outcomeAssessment,
            outcomeSummary: debrief.outcomeSummary,
          })
        }
      />

      <CriteriaSection
        items={debrief.criterionAssessments}
        pending={pending}
        onChange={(criterionAssessments) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, criterionAssessments },
          }))
        }
        onSave={() =>
          void patch("criteria", {
            criterionAssessments: debrief.criterionAssessments,
          })
        }
      />

      <PeopleSection
        items={debrief.peopleOutcomes}
        pending={pending}
        onChange={(peopleOutcomes) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, peopleOutcomes },
          }))
        }
        onSave={() =>
          void patch("peopleOutcomes", {
            peopleOutcomes: debrief.peopleOutcomes,
          })
        }
      />

      <OrgSection
        items={debrief.organizationOutcomes}
        pending={pending}
        onChange={(organizationOutcomes) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, organizationOutcomes },
          }))
        }
        onSave={() =>
          void patch("organizationOutcomes", {
            organizationOutcomes: debrief.organizationOutcomes,
          })
        }
      />

      <CommitmentSection
        items={debrief.commitmentReviews}
        pending={pending}
        onChange={(commitmentReviews) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, commitmentReviews },
          }))
        }
        onSave={() =>
          void patch("commitmentReviews", {
            commitmentReviews: debrief.commitmentReviews,
          })
        }
      />

      <FollowUpSection
        items={debrief.followUpReviews}
        pending={pending}
        onChange={(followUpReviews) =>
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, followUpReviews },
          }))
        }
        onSave={() =>
          void patch("followUpReviews", {
            followUpReviews: debrief.followUpReviews,
          })
        }
      />

      <ListAddSection
        title="What worked"
        helper="Example only when empty: Candidate arrived early enough for host conversation."
        items={debrief.whatWorked}
        pending={pending}
        onAdd={(statement) => {
          const item: MissionLessonItem = {
            id: newId("ww"),
            statement,
            category: null,
            explanation: null,
            practiceOrChange: null,
            rootCause: null,
            importance: "NORMAL",
            createdAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const whatWorked = [...debrief.whatWorked, item];
          setView((v) => ({ ...v, debrief: { ...v.debrief, whatWorked } }));
          void patch("whatWorked", { whatWorked });
        }}
        onSave={() => void patch("whatWorked", { whatWorked: debrief.whatWorked })}
      />

      <ListAddSection
        title="What did not work"
        helper="Identify a process, assumption, resource, message, or logistical choice that should change next time."
        items={debrief.whatDidNotWork}
        pending={pending}
        onAdd={(statement) => {
          const item: MissionLessonItem = {
            id: newId("wd"),
            statement,
            category: null,
            explanation: null,
            practiceOrChange: null,
            rootCause: null,
            importance: "NORMAL",
            createdAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const whatDidNotWork = [...debrief.whatDidNotWork, item];
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, whatDidNotWork },
          }));
          void patch("whatDidNotWork", { whatDidNotWork });
        }}
        onSave={() =>
          void patch("whatDidNotWork", {
            whatDidNotWork: debrief.whatDidNotWork,
          })
        }
      />

      <LessonsSection
        items={debrief.lessonsLearned}
        pending={pending}
        onAdd={(statement) => {
          const item: MissionLesson = {
            id: newId("lesson"),
            statement,
            evidence: null,
            recommendedChange: null,
            applicability: null,
            category: null,
            importance: "NORMAL",
            recommendForCampaignKnowledge: false,
            createdAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const lessonsLearned = [...debrief.lessonsLearned, item];
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, lessonsLearned },
          }));
          void patch("lessons", { lessonsLearned });
        }}
        onToggleKnowledge={(id) => {
          const lessonsLearned = debrief.lessonsLearned.map((l) =>
            l.id === id
              ? {
                  ...l,
                  recommendForCampaignKnowledge: !l.recommendForCampaignKnowledge,
                }
              : l,
          );
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, lessonsLearned },
          }));
          void patch("lessons", { lessonsLearned });
        }}
      />

      <InsightsSection
        items={debrief.strategicInsights}
        pending={pending}
        onAdd={(text) => {
          const item: MissionStrategicInsight = {
            id: newId("si"),
            text,
            createdAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const strategicInsights = [...debrief.strategicInsights, item];
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, strategicInsights },
          }));
          void patch("insights", { strategicInsights });
        }}
      />

      <QuestionsSection
        items={debrief.unresolvedQuestions}
        pending={pending}
        onAdd={(question) => {
          const item: MissionUnresolvedQuestion = {
            id: newId("uq"),
            question,
            whyItMatters: null,
            owner: null,
            dueAt: null,
            relatedTo: null,
            status: "OPEN",
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const unresolvedQuestions = [...debrief.unresolvedQuestions, item];
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, unresolvedQuestions },
          }));
          void patch("questions", { unresolvedQuestions });
        }}
      />

      <ActionsSection
        items={debrief.recommendedNextSteps}
        pending={pending}
        onAdd={(text) => {
          const item: MissionDebriefAction = {
            id: newId("act"),
            text,
            owner: null,
            priority: "NORMAL",
            dueAt: null,
            relatedPerson: null,
            relatedOrganization: null,
            relatedCommitmentId: null,
            relatedFollowUpId: null,
            source: "OPERATOR_ADDED",
            approvedForFollowUp: false,
            completed: false,
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByUserId: null,
          };
          const recommendedNextSteps = [...debrief.recommendedNextSteps, item];
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, recommendedNextSteps },
          }));
          void patch("nextActions", { recommendedNextSteps });
        }}
        onToggleFollowUp={(id) => {
          const recommendedNextSteps = debrief.recommendedNextSteps.map((a) =>
            a.id === id
              ? { ...a, approvedForFollowUp: !a.approvedForFollowUp }
              : a,
          );
          setView((v) => ({
            ...v,
            debrief: { ...v.debrief, recommendedNextSteps },
          }));
          void patch("nextActions", { recommendedNextSteps });
        }}
      />

      <section className="panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Internal notes</h2>
        <label className="field">
          <span className="field-label">Notes</span>
          <textarea
            rows={3}
            value={debrief.internalNotes ?? ""}
            disabled={pending}
            onChange={(e) =>
              setView((v) => ({
                ...v,
                debrief: { ...v.debrief, internalNotes: e.target.value },
              }))
            }
          />
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={() =>
            void patch("notes", { internalNotes: debrief.internalNotes })
          }
        >
          Save notes
        </button>
      </section>

      <section className="panel" aria-labelledby="complete-heading">
        <h2 id="complete-heading">Complete and approve</h2>
        <p className="muted">
          Completion means the review is filled out. Approval is a separate
          leadership action. Neither changes Event scheduling, lifecycle phase,
          Prepare, or Execute records.
        </p>
        {debrief.debriefStatus === "IN_PROGRESS" ||
        debrief.debriefStatus === "NOT_STARTED" ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => void patch("complete")}
          >
            Complete Debrief
          </button>
        ) : null}
        {debrief.debriefStatus === "COMPLETED" ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Approve this After-Action Review as the official Mission Debrief?",
                )
              ) {
                return;
              }
              void patch("approve");
            }}
          >
            Approve Debrief
          </button>
        ) : null}
        {debrief.debriefStatus === "COMPLETED" ? (
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={() => void patch("reopen")}
          >
            Reopen for edits
          </button>
        ) : null}
        {debrief.debriefStatus === "APPROVED" ? (
          <p role="status">
            Debrief approved
            {debrief.approvedAt ? ` at ${debrief.approvedAt}` : ""}. Follow-up Mode
            will consume items marked approved for follow-up.
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

function OutcomeSection({
  debrief,
  pending,
  onChange,
  onSave,
}: {
  debrief: MissionDebriefViewModel["debrief"];
  pending: boolean;
  onChange: (a: MissionOutcomeAssessment, s: string | null) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel" aria-labelledby="outcome-heading">
      <h2 id="outcome-heading">Outcome assessment</h2>
      <p className="muted">
        Summarize what the Mission accomplished, what remains uncertain, and the
        most important result. Do not infer outcome from attendance or task counts.
      </p>
      <fieldset className="debrief-radio-set">
        <legend>Outcome</legend>
        {OUTCOME_ASSESSMENTS.filter((o) => o !== "NOT_ASSESSED").map((value) => (
          <label key={value} className="debrief-radio">
            <input
              type="radio"
              name="outcome"
              value={value}
              checked={debrief.outcomeAssessment === value}
              disabled={pending}
              onChange={() => onChange(value, debrief.outcomeSummary)}
            />
            {labelOutcomeAssessment(value)}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="field-label">Outcome summary</span>
        <textarea
          rows={4}
          value={debrief.outcomeSummary ?? ""}
          disabled={pending}
          onChange={(e) =>
            onChange(debrief.outcomeAssessment, e.target.value || null)
          }
        />
      </label>
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save outcome
      </button>
    </section>
  );
}

function CriteriaSection({
  items,
  pending,
  onChange,
  onSave,
}: {
  items: MissionDebriefViewModel["debrief"]["criterionAssessments"];
  pending: boolean;
  onChange: (
    items: MissionDebriefViewModel["debrief"]["criterionAssessments"],
  ) => void;
  onSave: () => void;
}) {
  if (items.length === 0) {
    return (
      <section className="panel" aria-labelledby="criteria-heading">
        <h2 id="criteria-heading">Success criteria</h2>
        <p className="muted">No success criteria were defined for this Mission.</p>
      </section>
    );
  }
  return (
    <section className="panel" aria-labelledby="criteria-heading">
      <h2 id="criteria-heading">Success criteria</h2>
      <ul className="debrief-card-list">
        {items.map((c, index) => (
          <li key={c.id} className="debrief-card">
            <p>
              <strong>{c.criterionText}</strong>
            </p>
            <label className="field">
              <span className="field-label">Assessment</span>
              <select
                value={c.assessment}
                disabled={pending}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = {
                    ...c,
                    assessment: e.target.value as CriterionAssessmentValue,
                    updatedAt: new Date().toISOString(),
                  };
                  onChange(next);
                }}
              >
                {CRITERION_ASSESSMENTS.map((v) => (
                  <option key={v} value={v}>
                    {labelCriterionAssessment(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Evidence</span>
              <textarea
                rows={2}
                value={c.evidence ?? ""}
                disabled={pending}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = {
                    ...c,
                    evidence: e.target.value || null,
                    updatedAt: new Date().toISOString(),
                  };
                  onChange(next);
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save success-criteria review
      </button>
    </section>
  );
}

function PeopleSection({
  items,
  pending,
  onChange,
  onSave,
}: {
  items: MissionDebriefViewModel["debrief"]["peopleOutcomes"];
  pending: boolean;
  onChange: (items: MissionDebriefViewModel["debrief"]["peopleOutcomes"]) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel" aria-labelledby="people-heading">
      <h2 id="people-heading">People outcomes</h2>
      {items.length === 0 ? (
        <p className="muted">No people context from Prepare or Execute.</p>
      ) : (
        <ul className="debrief-card-list">
          {items.map((p, index) => (
            <li key={p.id} className="debrief-card">
              <p>
                <strong>{p.name}</strong>
                {p.roleOrOrg ? ` · ${p.roleOrOrg}` : ""}
              </p>
              <p className="muted">
                Goal: {p.prepareGoal ?? "—"} · Execute: {p.executeState ?? "—"}
              </p>
              <label className="field">
                <span className="field-label">Relationship outcome</span>
                <select
                  value={p.relationshipOutcome}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...p,
                      relationshipOutcome: e.target
                        .value as RelationshipOutcomeValue,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                >
                  {RELATIONSHIP_OUTCOMES.map((v) => (
                    <option key={v} value={v}>
                      {labelRelationshipOutcome(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Recommended next step</span>
                <input
                  type="text"
                  value={p.recommendedNextStep ?? ""}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...p,
                      recommendedNextStep: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
              </label>
              <label className="debrief-check">
                <input
                  type="checkbox"
                  checked={p.followUpNeeded}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...p,
                      followUpNeeded: e.target.checked,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
                Follow-up needed
              </label>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save people outcomes
      </button>
    </section>
  );
}

function OrgSection({
  items,
  pending,
  onChange,
  onSave,
}: {
  items: MissionDebriefViewModel["debrief"]["organizationOutcomes"];
  pending: boolean;
  onChange: (
    items: MissionDebriefViewModel["debrief"]["organizationOutcomes"],
  ) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel" aria-labelledby="org-heading">
      <h2 id="org-heading">Organization outcomes</h2>
      <p className="muted">Engagement is not endorsement.</p>
      {items.length === 0 ? (
        <p className="muted">No organization context from Prepare or Execute.</p>
      ) : (
        <ul className="debrief-card-list">
          {items.map((o, index) => (
            <li key={o.id} className="debrief-card">
              <p>
                <strong>{o.name}</strong>
              </p>
              <label className="field">
                <span className="field-label">Result</span>
                <select
                  value={o.result}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...o,
                      result: e.target.value as OrganizationResultValue,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                >
                  {ORGANIZATION_RESULTS.map((v) => (
                    <option key={v} value={v}>
                      {labelOrganizationResult(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Recommended next step</span>
                <input
                  type="text"
                  value={o.recommendedNextStep ?? ""}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...o,
                      recommendedNextStep: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
              </label>
              <label className="debrief-check">
                <input
                  type="checkbox"
                  checked={o.followUpNeeded}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...o,
                      followUpNeeded: e.target.checked,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
                Follow-up needed
              </label>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save organization outcomes
      </button>
    </section>
  );
}

function CommitmentSection({
  items,
  pending,
  onChange,
  onSave,
}: {
  items: MissionDebriefViewModel["debrief"]["commitmentReviews"];
  pending: boolean;
  onChange: (
    items: MissionDebriefViewModel["debrief"]["commitmentReviews"],
  ) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel" aria-labelledby="commit-heading">
      <h2 id="commit-heading">Commitments review</h2>
      <p className="muted">
        Original Execute capture stays inspectable. Clarifications are Debrief-layer
        only.
      </p>
      {items.length === 0 ? (
        <p className="muted">No commitments were captured in Execute Mode.</p>
      ) : (
        <ul className="debrief-card-list">
          {items.map((c, index) => (
            <li key={c.id} className="debrief-card">
              <p>
                <strong>{c.originalText}</strong>
              </p>
              <label className="field">
                <span className="field-label">Clarification</span>
                <textarea
                  rows={2}
                  value={c.clarification ?? ""}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...c,
                      clarification: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
              </label>
              <label className="field">
                <span className="field-label">Owner</span>
                <input
                  type="text"
                  value={c.owner ?? ""}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...c,
                      owner: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
              </label>
              <div className="debrief-chip-row">
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={c.confirmed}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...c, confirmed: e.target.checked };
                      onChange(next);
                    }}
                  />
                  Confirmed
                </label>
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={c.resolved}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...c, resolved: e.target.checked };
                      onChange(next);
                    }}
                  />
                  Resolved
                </label>
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={c.uncertain}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...c, uncertain: e.target.checked };
                      onChange(next);
                    }}
                  />
                  Uncertain
                </label>
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={c.approvedForFollowUp}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...c,
                        approvedForFollowUp: e.target.checked,
                      };
                      onChange(next);
                    }}
                  />
                  Approve for Follow-up
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save commitment review
      </button>
    </section>
  );
}

function FollowUpSection({
  items,
  pending,
  onChange,
  onSave,
}: {
  items: MissionDebriefViewModel["debrief"]["followUpReviews"];
  pending: boolean;
  onChange: (
    items: MissionDebriefViewModel["debrief"]["followUpReviews"],
  ) => void;
  onSave: () => void;
}) {
  return (
    <section className="panel" aria-labelledby="fu-heading">
      <h2 id="fu-heading">Immediate follow-up review</h2>
      {items.length === 0 ? (
        <p className="muted">No immediate follow-ups were captured in Execute Mode.</p>
      ) : (
        <ul className="debrief-card-list">
          {items.map((f, index) => (
            <li key={f.id} className="debrief-card">
              <p>
                <strong>{f.originalText}</strong>
              </p>
              <label className="field">
                <span className="field-label">Clarification</span>
                <textarea
                  rows={2}
                  value={f.clarification ?? ""}
                  disabled={pending}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...f,
                      clarification: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    };
                    onChange(next);
                  }}
                />
              </label>
              <div className="debrief-chip-row">
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={f.resolved}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...f, resolved: e.target.checked };
                      onChange(next);
                    }}
                  />
                  Resolved
                </label>
                <label className="debrief-check">
                  <input
                    type="checkbox"
                    checked={f.approvedForFollowUp}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = {
                        ...f,
                        approvedForFollowUp: e.target.checked,
                      };
                      onChange(next);
                    }}
                  />
                  Approve for Follow-up
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="button" disabled={pending} onClick={onSave}>
        Save follow-up review
      </button>
    </section>
  );
}

function ListAddSection({
  title,
  helper,
  items,
  pending,
  onAdd,
  onSave,
}: {
  title: string;
  helper: string;
  items: { id: string; statement: string }[];
  pending: boolean;
  onAdd: (statement: string) => void;
  onSave: () => void;
}) {
  const [draft, setDraft] = useState("");
  const headingId = useId();
  return (
    <section className="panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      <p className="muted">{helper}</p>
      <ul className="debrief-card-list">
        {items.map((item) => (
          <li key={item.id}>{item.statement}</li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add item</span>
        <input
          type="text"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={pending || !draft.trim()}
          onClick={() => {
            const text = draft.trim();
            if (!text) return;
            setDraft("");
            onAdd(text);
          }}
        >
          Add
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={onSave}
        >
          Save section
        </button>
      </div>
    </section>
  );
}

function LessonsSection({
  items,
  pending,
  onAdd,
  onToggleKnowledge,
}: {
  items: MissionLesson[];
  pending: boolean;
  onAdd: (statement: string) => void;
  onToggleKnowledge: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="panel" aria-labelledby="lessons-heading">
      <h2 id="lessons-heading">Lessons learned</h2>
      <p className="muted">
        What did we learn, what evidence supports it, and what should change?
      </p>
      <ul className="debrief-card-list">
        {items.map((l) => (
          <li key={l.id} className="debrief-card">
            <p>{l.statement}</p>
            <label className="debrief-check">
              <input
                type="checkbox"
                checked={l.recommendForCampaignKnowledge}
                disabled={pending}
                onChange={() => onToggleKnowledge(l.id)}
              />
              Recommend for campaign knowledge review
            </label>
          </li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add lesson</span>
        <input
          type="text"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button"
        disabled={pending || !draft.trim()}
        onClick={() => {
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          onAdd(text);
        }}
      >
        Add lesson
      </button>
    </section>
  );
}

function InsightsSection({
  items,
  pending,
  onAdd,
}: {
  items: MissionStrategicInsight[];
  pending: boolean;
  onAdd: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="panel" aria-labelledby="insights-heading">
      <h2 id="insights-heading">Strategic insights</h2>
      <p className="muted">
        Record what this Mission may suggest. Avoid treating one event as proof of a
        broader trend.
      </p>
      <ul className="debrief-card-list">
        {items.map((i) => (
          <li key={i.id}>{i.text}</li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add insight</span>
        <input
          type="text"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button"
        disabled={pending || !draft.trim()}
        onClick={() => {
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          onAdd(text);
        }}
      >
        Add insight
      </button>
    </section>
  );
}

function QuestionsSection({
  items,
  pending,
  onAdd,
}: {
  items: MissionUnresolvedQuestion[];
  pending: boolean;
  onAdd: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="panel" aria-labelledby="questions-heading">
      <h2 id="questions-heading">Unresolved questions</h2>
      <p className="muted">Do not invent answers. Research is deferred.</p>
      <ul className="debrief-card-list">
        {items.map((q) => (
          <li key={q.id}>
            {q.question}{" "}
            <span className="muted">({q.status})</span>
          </li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add question</span>
        <input
          type="text"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button"
        disabled={pending || !draft.trim()}
        onClick={() => {
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          onAdd(text);
        }}
      >
        Add question
      </button>
    </section>
  );
}

function ActionsSection({
  items,
  pending,
  onAdd,
  onToggleFollowUp,
}: {
  items: MissionDebriefAction[];
  pending: boolean;
  onAdd: (text: string) => void;
  onToggleFollowUp: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="panel" aria-labelledby="actions-heading">
      <h2 id="actions-heading">Recommended next actions</h2>
      <p className="muted">
        Human-approved actions only. Follow-up Mode will consume approved items later.
      </p>
      <ul className="debrief-card-list">
        {items.map((a) => (
          <li key={a.id} className="debrief-card">
            <p>{a.text}</p>
            <label className="debrief-check">
              <input
                type="checkbox"
                checked={a.approvedForFollowUp}
                disabled={pending}
                onChange={() => onToggleFollowUp(a.id)}
              />
              Approved for Follow-up Mode
            </label>
          </li>
        ))}
      </ul>
      <label className="field">
        <span className="field-label">Add action</span>
        <input
          type="text"
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button"
        disabled={pending || !draft.trim()}
        onClick={() => {
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          onAdd(text);
        }}
      >
        Add action
      </button>
    </section>
  );
}
