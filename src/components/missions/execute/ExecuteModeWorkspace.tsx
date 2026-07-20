"use client";

import Link from "next/link";
import { useState } from "react";
import type { MissionExecuteViewModel } from "@/lib/missions/v21/execution";
import {
  labelExecutionStatus,
  labelFollowUpPriority,
  labelOrgContactState,
  labelPersonContactState,
} from "@/lib/missions/v21/execution";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation";
import type {
  MissionCommitment,
  MissionImmediateFollowUp,
  MissionObservation,
  OrgContactState,
  PersonContactState,
} from "@/lib/missions/v21/execution";

type Props = { initial: MissionExecuteViewModel };

type SaveState = "idle" | "saving" | "saved" | "error";

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ExecuteModeWorkspace({ initial }: Props) {
  const [view, setView] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [obsText, setObsText] = useState("");
  const [commitmentText, setCommitmentText] = useState("");
  const [followUpText, setFollowUpText] = useState("");
  const [fieldNotes, setFieldNotes] = useState(
    initial.execution.fieldNotes ?? "",
  );
  const [arrivalNote, setArrivalNote] = useState(
    initial.execution.arrivalNote ?? "",
  );

  const { mission, preparation, execution } = view;

  async function patch(section: string, payload: Record<string, unknown> = {}) {
    if (pending) return;
    setPending(true);
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/missions/${mission.missionId}/execution`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Save failed.");
      }
      setView({
        mission: json.mission,
        preparation: json.preparation,
        execution: json.execution,
        lifecyclePhaseUnchangedByExecution: true,
        operationalStatusUnchangedByExecution: true,
        preparationReadOnly: true,
        eventScheduleEditableHere: false,
      });
      setFieldNotes(json.execution.fieldNotes ?? "");
      setArrivalNote(json.execution.arrivalNote ?? "");
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setPending(false);
    }
  }

  const stickyAction =
    execution.executionStatus === "NOT_STARTED"
      ? { label: "Mark Arrived", run: () => patch("arrive", { note: arrivalNote || null }) }
      : execution.executionStatus === "ARRIVED"
        ? { label: "Begin Mission", run: () => patch("start") }
        : execution.executionStatus === "IN_PROGRESS"
          ? {
              label: "End Active Mission",
              run: () => patch("complete"),
            }
          : null;

  return (
    <div className="page-stack execute-mode">
      <header className="execute-mode-header">
        <p className="todays-mission-kicker">Execute</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <br />
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p>
          <span className="prepare-badge">
            Lifecycle: {mission.lifecyclePhaseLabel}
          </span>
          <span aria-hidden="true"> · </span>
          <span className="prepare-badge">
            Execution: {labelExecutionStatus(execution.executionStatus)}
          </span>
          {preparation.readiness ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="prepare-badge">
                Brief: {labelPreparationReadiness(preparation.readiness)}
              </span>
            </>
          ) : null}
        </p>
        <nav className="prepare-mode-nav" aria-label="Execute Mode navigation">
          <Link href="/">Today’s Mission</Link>
          <Link href="/system/missions/command-center">
            Mission Command Center
          </Link>
          <Link href={`/system/missions/${mission.missionId}/prepare`}>
            Open Mission Brief
          </Link>
          <Link href={`/system/missions/${mission.missionId}/field-ops`}>
            Field Ops
          </Link>
          <Link href={`/system/missions/${mission.missionId}/staffing`}>
            Staffing
          </Link>
          <Link href={`/system/missions/${mission.missionId}/incidents`}>
            Incidents
          </Link>
          <Link href={mission.detailHref}>Mission record</Link>
        </nav>
        <div className="prepare-save-status" role="status" aria-live="polite">
          {saveState === "saving" ? "Saving…" : null}
          {saveState === "saved" ? "Saved." : null}
          {saveState === "error" && error ? (
            <>
              Error: {error}. Your text is still here — retry when ready.
            </>
          ) : null}
        </div>
      </header>

      {stickyAction ? (
        <div className="execute-sticky-action">
          <button
            type="button"
            className="button execute-primary-btn"
            disabled={pending}
            onClick={stickyAction.run}
          >
            {stickyAction.label}
          </button>
        </div>
      ) : null}

      <section className="panel" aria-labelledby="execute-field-ops-h">
        <h2 id="execute-field-ops-h">Field Day Operations</h2>
        <p className="muted" role="note">
          Execute Mode tracks active mission progress. Field Ops confirms
          on-site readiness and item presence — it does not start or complete
          execution.
        </p>
        <Link
          className="button secondary"
          href={`/system/missions/${mission.missionId}/field-ops`}
        >
          Open Field Ops
        </Link>
      </section>

      <section className="panel" aria-labelledby="execute-staffing-h">
        <h2 id="execute-staffing-h">Volunteer Staffing</h2>
        <p className="muted" role="note">
          Staffing tracks explicit volunteer assignments — separate from RSVP,
          check-in, and Execute progress.
        </p>
        <Link
          className="button secondary"
          href={`/system/missions/${mission.missionId}/staffing`}
        >
          Open Staffing
        </Link>
      </section>

      <section className="panel" aria-labelledby="execute-incidents-h">
        <h2 id="execute-incidents-h">Mission Incidents</h2>
        <p className="muted" role="note">
          Structured exception capture during Execute — not emergency dispatch.
        </p>
        <Link
          className="button secondary"
          href={`/system/missions/${mission.missionId}/incidents`}
        >
          Open Incidents
        </Link>
      </section>

      {execution.executionStatus === "NOT_STARTED" ? (
        <section className="panel" aria-labelledby="arrive-heading">
          <h2 id="arrive-heading">Arrival</h2>
          <label htmlFor="arrivalNote">Optional arrival note</label>
          <textarea
            id="arrivalNote"
            value={arrivalNote}
            onChange={(e) => setArrivalNote(e.target.value)}
            rows={2}
            placeholder="Parking, entrance, host status…"
          />
          <button
            type="button"
            className="button prepare-save-btn"
            disabled={pending}
            onClick={() => patch("arrive", { note: arrivalNote || null })}
          >
            Mark Arrived
          </button>
        </section>
      ) : null}

      {execution.executionStatus === "ARRIVED" ? (
        <section className="panel" aria-labelledby="begin-heading">
          <h2 id="begin-heading">Begin mission</h2>
          <p className="muted">
            Arrived
            {execution.arrivedAt
              ? ` at ${new Date(execution.arrivedAt).toLocaleTimeString()}`
              : ""}
            . Start active execution when the team is ready — not auto-inferred
            from Event time.
          </p>
          <button
            type="button"
            className="button prepare-save-btn"
            disabled={pending}
            onClick={() => patch("start")}
          >
            Begin Mission
          </button>
        </section>
      ) : null}

      {execution.executionStatus === "COMPLETED" ? (
        <section className="panel" role="status" aria-labelledby="ended-heading">
          <h2 id="ended-heading">Active execution ended</h2>
          <p>
            Debrief is ready when the team is prepared to review the Mission.
          </p>
          <Link
            className="button"
            href={`/system/missions/${mission.missionId}/debrief`}
          >
            Open Debrief
          </Link>
        </section>
      ) : null}

      <section className="panel execute-key-message" aria-labelledby="key-heading">
        <h2 id="key-heading">Key message</h2>
        <p className="muted">What should people remember after Kelly leaves?</p>
        {preparation.keyMessage ? (
          <p className="execute-key-message-text">{preparation.keyMessage}</p>
        ) : (
          <p className="muted">No key message has been prepared.</p>
        )}
        <Link href={`/system/missions/${mission.missionId}/prepare`}>
          Edit in Prepare Mode
        </Link>
      </section>

      <section className="panel" aria-labelledby="objective-heading">
        <h2 id="objective-heading">Mission objective</h2>
        <div className="prepare-projected">
          <p className="prepare-source-label">Projected · From Event</p>
          <p>{mission.objective ?? "No objective projected yet."}</p>
          <h3>Success looks like</h3>
          {preparation.successCriteria.length ? (
            <ul>
              {preparation.successCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No success criteria stored.</p>
          )}
        </div>
        {preparation.strategicPurpose ? (
          <div>
            <p className="prepare-source-label">Campaign Brief · Read-only</p>
            <p>
              <strong>Strategic purpose.</strong> {preparation.strategicPurpose}
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="people-heading">
        <h2 id="people-heading">People to find</h2>
        {execution.peopleContacts.length === 0 &&
        preparation.people.length === 0 ? (
          <p className="muted">No people briefing prepared for this Mission.</p>
        ) : (
          <ul className="execute-card-list">
            {(execution.peopleContacts.length
              ? execution.peopleContacts
              : preparation.people.map((p) => ({
                  id: p.id,
                  preparePersonId: p.id,
                  name: p.name,
                  state: "NOT_SEEN" as PersonContactState,
                  note: null,
                  updatedAt: "",
                }))
            ).map((contact) => {
              const brief = preparation.people.find(
                (p) => p.id === contact.preparePersonId || p.name === contact.name,
              );
              return (
                <li key={contact.id} className="execute-person-card">
                  <strong>{contact.name}</strong>
                  {brief?.roleOrTitle ? (
                    <span className="muted"> · {brief.roleOrTitle}</span>
                  ) : null}
                  {brief?.whyTheyMatter ? <p>{brief.whyTheyMatter}</p> : null}
                  {brief?.conversationGoal ? (
                    <p className="muted">Goal: {brief.conversationGoal}</p>
                  ) : null}
                  <p>
                    Status: {labelPersonContactState(contact.state)}
                    <span className="visually-hidden">
                      {" "}
                      — {contact.state}
                    </span>
                  </p>
                  <div className="execute-chip-row">
                    {(
                      [
                        ["NOT_SEEN", "Not seen"],
                        ["SPOKE_WITH", "Spoke with"],
                        ["MISSED", "Missed"],
                      ] as const
                    ).map(([state, label]) => (
                      <button
                        key={state}
                        type="button"
                        className="button secondary execute-chip"
                        disabled={pending}
                        aria-pressed={contact.state === state}
                        onClick={() => {
                          const peopleContacts = (
                            execution.peopleContacts.length
                              ? execution.peopleContacts
                              : preparation.people.map((p) => ({
                                  id: p.id,
                                  preparePersonId: p.id,
                                  name: p.name,
                                  state: "NOT_SEEN" as PersonContactState,
                                  note: null,
                                  updatedAt: new Date().toISOString(),
                                }))
                          ).map((c) =>
                            c.id === contact.id || c.name === contact.name
                              ? {
                                  ...c,
                                  state: state as PersonContactState,
                                  updatedAt: new Date().toISOString(),
                                }
                              : c,
                          );
                          void patch("peopleContacts", { peopleContacts });
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="orgs-heading">
        <h2 id="orgs-heading">Organizations to engage</h2>
        {execution.organizationContacts.length === 0 &&
        preparation.organizations.length === 0 ? (
          <p className="muted">No organization briefing prepared.</p>
        ) : (
          <ul className="execute-card-list">
            {(execution.organizationContacts.length
              ? execution.organizationContacts
              : preparation.organizations.map((o) => ({
                  id: o.id,
                  prepareOrganizationId: o.id,
                  name: o.name,
                  state: "NOT_ENGAGED" as OrgContactState,
                  note: null,
                  updatedAt: "",
                }))
            ).map((contact) => {
              const brief = preparation.organizations.find(
                (o) =>
                  o.id === contact.prepareOrganizationId || o.name === contact.name,
              );
              return (
                <li key={contact.id} className="execute-person-card">
                  <strong>{contact.name}</strong>
                  {brief?.desiredOutcome ? (
                    <p className="muted">Desired: {brief.desiredOutcome}</p>
                  ) : null}
                  <p>Status: {labelOrgContactState(contact.state)}</p>
                  <div className="execute-chip-row">
                    {(
                      [
                        ["NOT_ENGAGED", "Not engaged"],
                        ["ENGAGED", "Engaged"],
                        ["FOLLOW_UP_NEEDED", "Follow-up needed"],
                      ] as const
                    ).map(([state, label]) => (
                      <button
                        key={state}
                        type="button"
                        className="button secondary execute-chip"
                        disabled={pending}
                        aria-pressed={contact.state === state}
                        onClick={() => {
                          const organizationContacts = (
                            execution.organizationContacts.length
                              ? execution.organizationContacts
                              : preparation.organizations.map((o) => ({
                                  id: o.id,
                                  prepareOrganizationId: o.id,
                                  name: o.name,
                                  state: "NOT_ENGAGED" as OrgContactState,
                                  note: null,
                                  updatedAt: new Date().toISOString(),
                                }))
                          ).map((c) =>
                            c.id === contact.id || c.name === contact.name
                              ? {
                                  ...c,
                                  state: state as OrgContactState,
                                  updatedAt: new Date().toISOString(),
                                }
                              : c,
                          );
                          void patch("organizationContacts", {
                            organizationContacts,
                          });
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="obs-heading">
        <h2 id="obs-heading">Live observations</h2>
        <ul className="execute-card-list">
          {execution.liveObservations.map((o) => (
            <li key={o.id}>
              <strong>
                {new Date(o.createdAt).toLocaleTimeString()}
                {o.important ? " · Important" : ""}
              </strong>
              <p>{o.text}</p>
            </li>
          ))}
        </ul>
        <label htmlFor="obsText">Add observation</label>
        <textarea
          id="obsText"
          value={obsText}
          onChange={(e) => setObsText(e.target.value)}
          rows={3}
          placeholder="What are you seeing or hearing?"
        />
        <button
          type="button"
          className="button prepare-save-btn"
          disabled={pending || !obsText.trim()}
          onClick={() => {
            const item: MissionObservation = {
              id: newId("obs"),
              text: obsText.trim(),
              category: null,
              important: false,
              createdAt: new Date().toISOString(),
              createdByUserId: null,
            };
            const liveObservations = [...execution.liveObservations, item];
            setObsText("");
            void patch("observations", { liveObservations });
          }}
        >
          Add observation
        </button>
      </section>

      <section className="panel" aria-labelledby="cmt-heading">
        <h2 id="cmt-heading">Commitments</h2>
        <ul className="execute-card-list">
          {execution.commitments.map((c) => (
            <li key={c.id} className="prepare-task-row">
              <label>
                <input
                  type="checkbox"
                  checked={c.completed}
                  disabled={pending}
                  onChange={(e) => {
                    const commitments = execution.commitments.map((x) =>
                      x.id === c.id
                        ? {
                            ...x,
                            completed: e.target.checked,
                            updatedAt: new Date().toISOString(),
                          }
                        : x,
                    );
                    void patch("commitments", { commitments });
                  }}
                />{" "}
                <span>
                  {c.text}
                  <span className="visually-hidden">
                    {c.completed ? " — complete" : " — open"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <label htmlFor="commitmentText">Add commitment</label>
        <textarea
          id="commitmentText"
          value={commitmentText}
          onChange={(e) => setCommitmentText(e.target.value)}
          rows={2}
          placeholder="Promise or deliverable made during the event"
        />
        <button
          type="button"
          className="button prepare-save-btn"
          disabled={pending || !commitmentText.trim()}
          onClick={() => {
            const now = new Date().toISOString();
            const item: MissionCommitment = {
              id: newId("cmt"),
              text: commitmentText.trim(),
              madeTo: null,
              owner: null,
              dueAt: null,
              needsFollowUp: true,
              completed: false,
              notes: null,
              createdAt: now,
              updatedAt: now,
              createdByUserId: null,
            };
            setCommitmentText("");
            void patch("commitments", {
              commitments: [...execution.commitments, item],
            });
          }}
        >
          Add commitment
        </button>
      </section>

      <section className="panel" aria-labelledby="fu-heading">
        <h2 id="fu-heading">Immediate follow-up</h2>
        <ul className="execute-card-list">
          {execution.immediateFollowUps.map((f) => (
            <li key={f.id}>
              <strong>{labelFollowUpPriority(f.priority)}</strong>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
        <label htmlFor="followUpText">Add follow-up</label>
        <textarea
          id="followUpText"
          value={followUpText}
          onChange={(e) => setFollowUpText(e.target.value)}
          rows={2}
          placeholder="Should not wait for full Debrief"
        />
        <button
          type="button"
          className="button prepare-save-btn"
          disabled={pending || !followUpText.trim()}
          onClick={() => {
            const now = new Date().toISOString();
            const item: MissionImmediateFollowUp = {
              id: newId("fu"),
              text: followUpText.trim(),
              relatedTo: null,
              owner: null,
              priority: "NORMAL",
              dueAt: null,
              completed: false,
              createdAt: now,
              updatedAt: now,
              createdByUserId: null,
            };
            setFollowUpText("");
            void patch("immediateFollowUps", {
              immediateFollowUps: [...execution.immediateFollowUps, item],
            });
          }}
        >
          Add follow-up
        </button>
      </section>

      <section className="panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Field notes</h2>
        <p className="muted">Optional catch-all — structured tools stay primary.</p>
        <label htmlFor="fieldNotes">Field notes</label>
        <textarea
          id="fieldNotes"
          value={fieldNotes}
          onChange={(e) => setFieldNotes(e.target.value)}
          rows={3}
        />
        <button
          type="button"
          className="button prepare-save-btn"
          disabled={pending}
          onClick={() => patch("fieldNotes", { fieldNotes: fieldNotes || null })}
        >
          Save field notes
        </button>
      </section>

      {execution.executionStatus === "IN_PROGRESS" ? (
        <section className="panel" aria-labelledby="end-heading">
          <h2 id="end-heading">End active mission</h2>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => patch("complete")}
          >
            End Active Mission
          </button>
        </section>
      ) : null}
    </div>
  );
}
