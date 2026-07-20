"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  MissionPreparationRecord,
  PreparationListItem,
  PreparationTask,
  PrepareWorkspaceView,
} from "@/lib/missions/v21/preparation";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation";

type Props = {
  initial: PrepareWorkspaceView;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function linesToItems(text: string): PreparationListItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => ({ id: `line_${i}_${line.slice(0, 12)}`, text: line }));
}

function itemsToLines(items: PreparationListItem[]): string {
  return items.map((i) => i.text).join("\n");
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function PrepareModeWorkspace({ initial }: Props) {
  const { mission } = initial;
  const [prep, setPrep] = useState<MissionPreparationRecord>(initial.preparation);
  const [checks, setChecks] = useState(initial.readinessChecks);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirtySection, setDirtySection] = useState<string | null>(null);

  const projectedPeople = useMemo(() => {
    const section = mission.intelligence.sections.find((s) => s.title === "People");
    return section?.items ?? [];
  }, [mission.intelligence.sections]);

  const projectedOrgs = useMemo(() => {
    const section = mission.intelligence.sections.find((s) => s.title === "Organizations");
    return section?.items ?? [];
  }, [mission.intelligence.sections]);

  async function saveSection(section: string, payload: Record<string, unknown>) {
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/missions/${mission.missionId}/preparation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message || "Save failed.");
      }
      setPrep(json.preparation);
      setChecks(json.readinessChecks);
      setSaveState("saved");
      setDirtySection(null);
    } catch (e) {
      setSaveState("error");
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  function markDirty(section: string) {
    setDirtySection(section);
    if (saveState === "saved") setSaveState("idle");
  }

  return (
    <div className="page-stack prepare-mode">
      <header className="prepare-mode-header">
        <p className="todays-mission-kicker">Prepare</p>
        <h1>{mission.title}</h1>
        <p>
          {mission.whenLabel}
          <br />
          {mission.locationLabel ?? "Location unknown"}
        </p>
        <p>
          <span className="prepare-badge">Lifecycle: {mission.lifecyclePhaseLabel}</span>
          <span aria-hidden="true"> · </span>
          <span className="prepare-badge">
            Status: {mission.operationalStatusLabel}
          </span>
          <span aria-hidden="true"> · </span>
          <span className="prepare-badge prepare-badge-ready">
            Brief: {labelPreparationReadiness(prep.readinessState)}
          </span>
        </p>
        <nav className="prepare-mode-nav" aria-label="Prepare Mode navigation">
          <Link href="/">Today’s Mission</Link>
          <Link href="/system/missions/command-center">
            Mission Command Center
          </Link>
          <Link href={mission.detailHref}>Mission record</Link>
          <Link href={`/system/missions/${mission.missionId}/logistics`}>
            Logistics
          </Link>
          <Link href="/calendar">Calendar</Link>
        </nav>
        <div className="prepare-save-status" role="status" aria-live="polite">
          {saveState === "saving" ? "Saving…" : null}
          {saveState === "saved" ? "Saved." : null}
          {saveState === "error" && error ? `Error: ${error}` : null}
          {dirtySection && saveState !== "saving" ? "Unsaved changes" : null}
        </div>
      </header>

      <section className="panel" aria-labelledby="why-heading">
        <h2 id="why-heading">Why this mission matters</h2>
        <div className="prepare-projected">
          <p className="prepare-source-label">Projected · From Event</p>
          <h3>Mission objective</h3>
          <p>{mission.objective ?? "No objective projected yet."}</p>
          <h3>Success looks like</h3>
          {mission.successCriteria.length ? (
            <ul>
              {mission.successCriteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No success criteria are stored on this mission yet.</p>
          )}
        </div>
        <fieldset className="prepare-fieldset">
          <legend>Campaign Brief · Added by campaign</legend>
          <label htmlFor="strategicPurpose">Strategic purpose</label>
          <p className="muted prepare-help">
            Why the campaign is investing in this mission — distinct from the projected objective.
          </p>
          <textarea
            id="strategicPurpose"
            value={prep.strategicPurpose ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, strategicPurpose: e.target.value });
              markDirty("strategy");
            }}
            rows={3}
          />
          <label htmlFor="desiredImpression">Desired impression</label>
          <textarea
            id="desiredImpression"
            value={prep.desiredImpression ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, desiredImpression: e.target.value });
              markDirty("strategy");
            }}
            rows={2}
          />
          <label htmlFor="briefingSummary">Briefing summary</label>
          <textarea
            id="briefingSummary"
            value={prep.briefingSummary ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, briefingSummary: e.target.value });
              markDirty("strategy");
            }}
            rows={3}
          />
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("strategy", {
                strategicPurpose: prep.strategicPurpose,
                desiredImpression: prep.desiredImpression,
                briefingSummary: prep.briefingSummary,
              })
            }
          >
            Save strategy
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="message-heading">
        <h2 id="message-heading">Message preparation</h2>
        <fieldset className="prepare-fieldset">
          <legend>Campaign Brief</legend>
          <label htmlFor="keyMessage">Key message</label>
          <p className="muted prepare-help">
            What Kelly should leave people remembering.
          </p>
          <textarea
            id="keyMessage"
            value={prep.keyMessage ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, keyMessage: e.target.value });
              markDirty("message");
            }}
            rows={2}
          />
          <label htmlFor="talkingPoints">Talking points (one per line)</label>
          <textarea
            id="talkingPoints"
            value={itemsToLines(prep.talkingPoints)}
            onChange={(e) => {
              setPrep({ ...prep, talkingPoints: linesToItems(e.target.value) });
              markDirty("message");
            }}
            rows={4}
          />
          <label htmlFor="questionsToAsk">Questions to ask</label>
          <p className="muted prepare-help">
            What should Kelly learn from the people attending?
          </p>
          <textarea
            id="questionsToAsk"
            value={itemsToLines(prep.questionsToAsk)}
            onChange={(e) => {
              setPrep({ ...prep, questionsToAsk: linesToItems(e.target.value) });
              markDirty("message");
            }}
            rows={3}
          />
          <label htmlFor="thingsToNotice">Things to notice</label>
          <p className="muted prepare-help">
            Signals, concerns, relationships, or opportunities to watch for.
          </p>
          <textarea
            id="thingsToNotice"
            value={itemsToLines(prep.thingsToNotice)}
            onChange={(e) => {
              setPrep({ ...prep, thingsToNotice: linesToItems(e.target.value) });
              markDirty("message");
            }}
            rows={3}
          />
          <label htmlFor="sensitivities">Sensitivities / cautions</label>
          <textarea
            id="sensitivities"
            value={itemsToLines(prep.sensitivities)}
            onChange={(e) => {
              setPrep({ ...prep, sensitivities: linesToItems(e.target.value) });
              markDirty("message");
            }}
            rows={3}
          />
          <label htmlFor="commitmentsToAvoid">Commitments to avoid</label>
          <p className="muted prepare-help">
            What should be researched before Kelly promises an answer?
          </p>
          <textarea
            id="commitmentsToAvoid"
            value={itemsToLines(prep.commitmentsToAvoid)}
            onChange={(e) => {
              setPrep({
                ...prep,
                commitmentsToAvoid: linesToItems(e.target.value),
              });
              markDirty("message");
            }}
            rows={3}
          />
          <label htmlFor="closingApproach">Closing approach</label>
          <textarea
            id="closingApproach"
            value={prep.closingApproach ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, closingApproach: e.target.value });
              markDirty("message");
            }}
            rows={2}
          />
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("message", {
                keyMessage: prep.keyMessage,
                talkingPoints: prep.talkingPoints,
                questionsToAsk: prep.questionsToAsk,
                thingsToNotice: prep.thingsToNotice,
                sensitivities: prep.sensitivities,
                commitmentsToAvoid: prep.commitmentsToAvoid,
                closingApproach: prep.closingApproach,
                openingApproach: prep.openingApproach,
                storiesOrExamples: prep.storiesOrExamples,
              })
            }
          >
            Save message prep
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="people-heading">
        <h2 id="people-heading">People briefing</h2>
        <div className="prepare-projected">
          <p className="prepare-source-label">Projected · From Event</p>
          {projectedPeople.length ? (
            <ul>
              {projectedPeople.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No people have been connected to this Mission.</p>
          )}
        </div>
        <fieldset className="prepare-fieldset">
          <legend>Campaign Brief · People context</legend>
          <label htmlFor="peopleJson">
            Operator people notes (one person per block; use Name: lines)
          </label>
          <p className="muted prepare-help">
            Do not invent biographies. Record only what the campaign knows or sources.
          </p>
          <textarea
            id="peopleJson"
            value={prep.peopleBriefings
              .map(
                (p) =>
                  `Name: ${p.name}\nRole: ${p.roleOrTitle ?? ""}\nWhy: ${p.whyTheyMatter ?? ""}\nGoal: ${p.conversationGoal ?? ""}\nNotes: ${p.notes ?? ""}`,
              )
              .join("\n---\n")}
            onChange={(e) => {
              const blocks = e.target.value.split(/\n---\n/);
              const people = blocks
                .map((block, i) => {
                  const lines = Object.fromEntries(
                    block
                      .split("\n")
                      .map((l) => l.split(":").map((x) => x.trim()))
                      .filter((p) => p[0])
                      .map((p) => [p[0]!.toLowerCase(), p.slice(1).join(":").trim()]),
                  ) as Record<string, string>;
                  const name = lines.name || "";
                  if (!name) return null;
                  return {
                    id: prep.peopleBriefings[i]?.id || newId("person"),
                    name,
                    roleOrTitle: lines.role || null,
                    organization: lines.org || null,
                    relationshipToCampaign: lines.relationship || null,
                    whyTheyMatter: lines.why || null,
                    lastMeaningfulContact: lines.last || null,
                    conversationGoal: lines.goal || null,
                    notes: lines.notes || null,
                    sourceNote: lines.source || null,
                    linkedPersonId: null,
                  };
                })
                .filter(Boolean);
              setPrep({
                ...prep,
                peopleBriefings: people as MissionPreparationRecord["peopleBriefings"],
              });
              markDirty("people");
            }}
            rows={8}
          />
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("people", { peopleBriefings: prep.peopleBriefings })
            }
          >
            Save people briefing
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="orgs-heading">
        <h2 id="orgs-heading">Organization briefing</h2>
        <div className="prepare-projected">
          <p className="prepare-source-label">Projected · From Event</p>
          {projectedOrgs.length ? (
            <ul>
              {projectedOrgs.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No organizations have been connected to this Mission.
            </p>
          )}
          <p className="muted">
            Keyword-derived organization categories from projection are limited and
            not verified intelligence.
          </p>
        </div>
        <fieldset className="prepare-fieldset">
          <legend>Campaign Brief · Organization context</legend>
          <label htmlFor="orgsText">Operator organization notes (Name: blocks)</label>
          <textarea
            id="orgsText"
            value={prep.organizationBriefings
              .map(
                (o) =>
                  `Name: ${o.name}\nType: ${o.organizationType ?? ""}\nConcern: ${o.keyConcern ?? ""}\nOutcome: ${o.desiredOutcome ?? ""}\nNotes: ${o.notes ?? ""}`,
              )
              .join("\n---\n")}
            onChange={(e) => {
              const blocks = e.target.value.split(/\n---\n/);
              const orgs = blocks
                .map((block, i) => {
                  const lines = Object.fromEntries(
                    block
                      .split("\n")
                      .map((l) => l.split(":").map((x) => x.trim()))
                      .filter((p) => p[0])
                      .map((p) => [p[0]!.toLowerCase(), p.slice(1).join(":").trim()]),
                  ) as Record<string, string>;
                  const name = lines.name || "";
                  if (!name) return null;
                  return {
                    id: prep.organizationBriefings[i]?.id || newId("org"),
                    name,
                    organizationType: lines.type || null,
                    relationshipToMission: lines.relationship || null,
                    campaignRelationship: lines.campaign || null,
                    keyConcern: lines.concern || null,
                    desiredOutcome: lines.outcome || null,
                    notes: lines.notes || null,
                    sourceNote: lines.source || null,
                  };
                })
                .filter(Boolean);
              setPrep({
                ...prep,
                organizationBriefings:
                  orgs as MissionPreparationRecord["organizationBriefings"],
              });
              markDirty("organizations");
            }}
            rows={6}
          />
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("organizations", {
                organizationBriefings: prep.organizationBriefings,
              })
            }
          >
            Save organization briefing
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="logistics-heading">
        <h2 id="logistics-heading">Logistics preparation</h2>
        <div className="prepare-projected">
          <p className="prepare-source-label">Projected · From Event</p>
          <ul>
            <li>Time: {mission.whenLabel}</li>
            <li>Location: {mission.locationLabel ?? "unknown"}</li>
            <li>
              Travel: {mission.travelRequired ? "required" : "not required"}
            </li>
          </ul>
          <p className="muted">
            Schedule or location errors must be fixed in the Event workflow — not here.{" "}
            <Link href={`/calendar?event=${encodeURIComponent(mission.eventId)}&view=day`}>
              Open linked event
            </Link>
          </p>
        </div>
        <fieldset className="prepare-fieldset">
          <legend>Campaign Brief · Logistics</legend>
          <label htmlFor="arrivalInstructions">Arrival instructions</label>
          <textarea
            id="arrivalInstructions"
            value={prep.arrivalInstructions ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, arrivalInstructions: e.target.value });
              markDirty("logistics");
            }}
            rows={2}
          />
          <label htmlFor="parkingInstructions">Parking</label>
          <textarea
            id="parkingInstructions"
            value={prep.parkingInstructions ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, parkingInstructions: e.target.value });
              markDirty("logistics");
            }}
            rows={2}
          />
          <label htmlFor="entryContact">Entry / contact person</label>
          <input
            id="entryContact"
            type="text"
            value={prep.entryContact ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, entryContact: e.target.value });
              markDirty("logistics");
            }}
          />
          <label htmlFor="attireNotes">Attire</label>
          <input
            id="attireNotes"
            type="text"
            value={prep.attireNotes ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, attireNotes: e.target.value });
              markDirty("logistics");
            }}
          />
          <label htmlFor="materialsNeeded">Materials needed (one per line)</label>
          <textarea
            id="materialsNeeded"
            value={itemsToLines(prep.materialsNeeded)}
            onChange={(e) => {
              setPrep({ ...prep, materialsNeeded: linesToItems(e.target.value) });
              markDirty("logistics");
            }}
            rows={3}
          />
          <label htmlFor="logisticsNotes">Logistics notes</label>
          <textarea
            id="logisticsNotes"
            value={prep.logisticsNotes ?? ""}
            onChange={(e) => {
              setPrep({ ...prep, logisticsNotes: e.target.value });
              markDirty("logistics");
            }}
            rows={3}
          />
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("logistics", {
                arrivalInstructions: prep.arrivalInstructions,
                parkingInstructions: prep.parkingInstructions,
                entryContact: prep.entryContact,
                attireNotes: prep.attireNotes,
                materialsNeeded: prep.materialsNeeded,
                logisticsNotes: prep.logisticsNotes,
                accessibilityNotes: prep.accessibilityNotes,
                travelNotes: prep.travelNotes,
                lodgingNotes: prep.lodgingNotes,
              })
            }
          >
            Save logistics
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading">Preparation tasks</h2>
        <p className="muted">
          Mission-scoped checklist only. No notifications. No Google sync. Starter
          ideas (not auto-inserted): confirm host · printed materials · attendee
          list · arrival instructions · candidate briefing.
        </p>
        <ul className="prepare-task-list">
          {prep.preparationTasks.map((task, index) => (
            <li key={task.id}>
              <label className="prepare-task-row">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => {
                    const preparationTasks = prep.preparationTasks.map((t, i) =>
                      i === index
                        ? {
                            ...t,
                            completed: e.target.checked,
                            updatedAt: new Date().toISOString(),
                          }
                        : t,
                    );
                    setPrep({ ...prep, preparationTasks });
                    markDirty("tasks");
                  }}
                />
                <span>
                  <strong>{task.label}</strong>
                  {task.owner ? (
                    <span className="muted"> · {task.owner}</span>
                  ) : null}
                  <span className="visually-hidden">
                    {task.completed ? " — complete" : " — incomplete"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {prep.preparationTasks.length === 0 ? (
          <p className="muted">No preparation tasks yet.</p>
        ) : null}
        <fieldset className="prepare-fieldset">
          <legend>Add task</legend>
          <label htmlFor="newTask">Task label</label>
          <input
            id="newTask"
            type="text"
            placeholder="e.g. Confirm host contact"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const input = e.currentTarget;
              const label = input.value.trim();
              if (!label) return;
              const now = new Date().toISOString();
              const task: PreparationTask = {
                id: newId("task"),
                label,
                owner: null,
                dueAt: null,
                completed: false,
                notes: null,
                sortOrder: prep.preparationTasks.length,
                createdAt: now,
                updatedAt: now,
              };
              setPrep({
                ...prep,
                preparationTasks: [...prep.preparationTasks, task],
              });
              markDirty("tasks");
              input.value = "";
            }}
          />
          <p className="muted prepare-help">Press Enter to add. Then save tasks.</p>
          <button
            type="button"
            className="button prepare-save-btn"
            onClick={() =>
              saveSection("tasks", { preparationTasks: prep.preparationTasks })
            }
          >
            Save tasks
          </button>
        </fieldset>
      </section>

      <section className="panel" aria-labelledby="notes-heading">
        <h2 id="notes-heading">Operator notes</h2>
        <label htmlFor="operatorNotes">General notes</label>
        <textarea
          id="operatorNotes"
          value={prep.operatorNotes ?? ""}
          onChange={(e) => {
            setPrep({ ...prep, operatorNotes: e.target.value });
            markDirty("notes");
          }}
          rows={4}
        />
        <button
          type="button"
          className="button prepare-save-btn"
          onClick={() => saveSection("notes", { operatorNotes: prep.operatorNotes })}
        >
          Save notes
        </button>
      </section>

      <section className="panel" aria-labelledby="ready-heading">
        <h2 id="ready-heading">Brief readiness</h2>
        <p className="muted">
          Preparation readiness is separate from lifecycle phase (
          {mission.lifecyclePhaseLabel}) and operational status (
          {mission.operationalStatusLabel}). Marking ready does not advance the
          lifecycle.
        </p>
        <ul className="todays-mission-check-list">
          {checks.map((c) => (
            <li key={c.id}>
              <span aria-hidden="true">{c.ok ? "✓" : "–"}</span> {c.label}
              <span className="visually-hidden">
                {c.ok ? " — available" : " — missing"}
              </span>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button
            type="button"
            className="button"
            onClick={() => saveSection("readiness", { readinessState: "READY" })}
          >
            Mark Brief Ready
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              saveSection("readiness", { readinessState: "NEEDS_ATTENTION" })
            }
          >
            Mark Needs Attention
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => saveSection("readiness", { readinessState: "DRAFT" })}
          >
            Return to Draft
          </button>
        </div>
      </section>
    </div>
  );
}
