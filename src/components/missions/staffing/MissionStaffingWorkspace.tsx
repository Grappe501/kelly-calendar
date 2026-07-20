"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  assertStatusTransition,
  labelStaffingAssignmentStatus,
  labelStaffingCriticality,
  labelStaffingDisposition,
  labelStaffingFindingSeverity,
  labelStaffingPlanStatus,
  labelStaffingReadiness,
} from "@/lib/missions/v21/staffing";
import type {
  MissionStaffingAssignmentStatus,
  MissionStaffingAssignmentTargetType,
  MissionStaffingWorkspaceView,
} from "@/lib/missions/v21/staffing/types";

type Props = { initial: MissionStaffingWorkspaceView };

const TARGET_TYPES: MissionStaffingAssignmentTargetType[] = [
  "MANUAL_SCOPED",
  "CAMPAIGN_USER",
  "LOCAL_PERSON",
  "CONFIRMED_EXTERNAL_REF",
];

const TRANSITION_LABELS: Partial<
  Record<MissionStaffingAssignmentStatus, string>
> = {
  ASSIGNED: "Assign",
  CONFIRMED: "Confirm",
  CHECKED_IN: "Check in",
  CANCELLED: "Cancel",
  DECLINED: "Decline",
  RELEASED: "Release",
  NO_SHOW: "No-show",
  PROPOSED: "Propose",
};

async function jsonFetch(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Request failed.");
  }
  return json;
}

function formatWhen(
  startsAt: string,
  endsAt: string,
  timezone: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)} – ${endFmt.format(end)}`;
}

export function MissionStaffingWorkspace({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [roleLabel, setRoleLabel] = useState("");
  const [requiredCount, setRequiredCount] = useState("1");
  const [minimumCount, setMinimumCount] = useState("1");
  const [criticality, setCriticality] = useState<
    "CRITICAL" | "STANDARD" | "OPTIONAL"
  >("STANDARD");

  const [assignRequirementId, setAssignRequirementId] = useState("");
  const [targetType, setTargetType] =
    useState<MissionStaffingAssignmentTargetType>("MANUAL_SCOPED");
  const [manualDisplayLabel, setManualDisplayLabel] = useState("");
  const [campaignUserId, setCampaignUserId] = useState("");
  const [localPersonId, setLocalPersonId] = useState("");
  const [confirmedExternalPersonId, setConfirmedExternalPersonId] =
    useState("");

  const base = `/api/missions/${model.mission.id}/staffing`;
  const dateKey =
    model.plan?.campaignDateKey ??
    model.mission.startsAt.slice(0, 10);

  const requirementsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of model.plan?.requirements ?? []) {
      map.set(r.id, r.roleLabel);
    }
    return map;
  }, [model.plan?.requirements]);

  function applyModel(next: MissionStaffingWorkspaceView) {
    setModel(next);
    if (!assignRequirementId && next.plan?.requirements[0]?.id) {
      setAssignRequirementId(next.plan.requirements[0].id);
    }
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    }
  }

  async function patchAction(action: string, payload: unknown) {
    const json = await jsonFetch(base, "PATCH", { action, payload });
    applyModel(json.model);
  }

  function allowedTransitions(
    from: MissionStaffingAssignmentStatus,
  ): MissionStaffingAssignmentStatus[] {
    const all: MissionStaffingAssignmentStatus[] = [
      "PROPOSED",
      "ASSIGNED",
      "CONFIRMED",
      "CHECKED_IN",
      "CANCELLED",
      "DECLINED",
      "RELEASED",
      "NO_SHOW",
    ];
    return all.filter(
      (to) => to !== from && assertStatusTransition(from, to).ok,
    );
  }

  const mobilizeHref = model.mission.sourceEventId
    ? `/system/integrations/mobilize/attendance/${model.mission.sourceEventId}`
    : "/system/integrations/mobilize/attendance";

  return (
    <article className="page-stack mission-staffing-workspace">
      <header className="page-header">
        <p className="muted">Volunteer Staffing · {dateKey}</p>
        <h1>{model.mission.attendTitle}</h1>
        <p className="muted">
          {formatWhen(
            model.mission.startsAt,
            model.mission.endsAt,
            model.mission.timezone,
          )}
        </p>
        <p role="note">{model.notice}</p>
        <nav className="briefing-nav" aria-label="Staffing navigation">
          <Link href={`/system/missions/${model.mission.id}`}>Mission</Link>
          <Link href={`/system/missions/${model.mission.id}/execute`}>
            Execute
          </Link>
          <Link href={`/system/missions/${model.mission.id}/field-ops`}>
            Field Ops
          </Link>
          <Link href={`/calendar?event=${encodeURIComponent(model.mission.sourceEventId)}&view=day`}>
            Event
          </Link>
          <Link href={mobilizeHref}>Mobilize attendance</Link>
          <Link href={`/system/briefing/${dateKey}/staffing`}>
            Day Staffing Board
          </Link>
          <Link href={`/system/briefing/${dateKey}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${dateKey}/launch`}>Launch</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="staffing-status-h">
        <h2 id="staffing-status-h">Plan status</h2>
        <p>
          Readiness:{" "}
          <strong>{labelStaffingReadiness(model.readiness)}</strong>
          {model.plan ? (
            <>
              {" "}
              · Plan:{" "}
              <strong>{labelStaffingPlanStatus(model.plan.status)}</strong>
              {model.plan.isStale ? " · Stale" : ""}
              {model.plan.confirmedAt
                ? ` · Confirmed ${new Date(model.plan.confirmedAt).toLocaleString()}`
                : ""}
            </>
          ) : (
            " · No staffing plan yet"
          )}
        </p>
        {!model.plan ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await jsonFetch(base, "POST", {
                  staffingRequired: true,
                });
                applyModel(json.model);
                setMessage("Staffing plan opened.");
              })
            }
          >
            Open staffing plan
          </button>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="staffing-mobilize-h">
        <h2 id="staffing-mobilize-h">Mobilize availability (aggregate)</h2>
        <p className="muted">{model.mobilizeAvailability.note}</p>
        <ul className="briefing-fact-list">
          <li>Observations: {model.mobilizeAvailability.observationCount}</li>
          <li>
            Signups (registered):{" "}
            {model.mobilizeAvailability.totals.signupsRegistered}
          </li>
          <li>
            Signups (confirmed):{" "}
            {model.mobilizeAvailability.totals.signupsConfirmed}
          </li>
          <li>
            Cancellations: {model.mobilizeAvailability.totals.cancellations}
          </li>
          <li>Attended: {model.mobilizeAvailability.totals.attended}</li>
        </ul>
      </section>

      {model.coverage.length > 0 ? (
        <section className="panel" aria-labelledby="staffing-coverage-h">
          <h2 id="staffing-coverage-h">Coverage</h2>
          <ul className="briefing-list">
            {model.coverage.map((row) => (
              <li key={row.requirementId}>
                <h3>
                  {row.roleLabel} ({labelStaffingCriticality(row.criticality)})
                </h3>
                <dl className="briefing-dl">
                  <dt>Required</dt>
                  <dd>{row.requiredCount}</dd>
                  <dt>Minimum</dt>
                  <dd>{row.minimumCount}</dd>
                  <dt>Confirmed</dt>
                  <dd>{row.confirmed}</dd>
                  <dt>Checked in</dt>
                  <dd>{row.checkedIn}</dd>
                  <dt>Remaining gap</dt>
                  <dd>{row.remainingGap}</dd>
                  <dt>Minimum gap</dt>
                  <dd>{row.remainingMinimumGap}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.findings.length > 0 ? (
        <section
          className="panel briefing-risks"
          aria-labelledby="staffing-findings-h"
        >
          <h2 id="staffing-findings-h">Staffing findings</h2>
          <ul className="briefing-list">
            {model.findings.map((f) => (
              <li key={f.issueKey}>
                <h3>
                  {labelStaffingFindingSeverity(f.severity)}: {f.title}
                </h3>
                <p>{f.explanation}</p>
                <p className="muted">
                  Disposition:{" "}
                  {f.disposition
                    ? labelStaffingDisposition(f.disposition)
                    : "Open"}
                </p>
                {model.plan &&
                (!f.disposition || f.disposition === "ACKNOWLEDGED") ? (
                  <div className="closeout-button-row">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await patchAction("acknowledge", {
                            issueKey: f.issueKey,
                            issueType: f.issueType,
                            title: f.title,
                            disposition: "ACKNOWLEDGED",
                          });
                          setMessage(
                            "Acknowledged (does not clear blockers).",
                          );
                        })
                      }
                    >
                      Acknowledge
                    </button>
                    {f.severity === "BLOCKER" ? (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() => {
                          const reason = window.prompt(
                            "Accepted risk reason (required):",
                          );
                          if (!reason?.trim()) return;
                          run(async () => {
                            await patchAction("acknowledge", {
                              issueKey: f.issueKey,
                              issueType: f.issueType,
                              title: f.title,
                              disposition: "ACCEPTED_RISK",
                              acceptedRiskReason: reason.trim(),
                            });
                            setMessage(
                              "Accepted risk recorded. Underlying condition is not resolved.",
                            );
                          });
                        }}
                      >
                        Accept risk
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.plan ? (
        <>
          <section className="panel" aria-labelledby="staffing-req-h">
            <h2 id="staffing-req-h">Add requirement</h2>
            <label>
              Role label
              <input
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Required count
              <input
                type="number"
                min={0}
                value={requiredCount}
                onChange={(e) => setRequiredCount(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Minimum count
              <input
                type="number"
                min={0}
                value={minimumCount}
                onChange={(e) => setMinimumCount(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Criticality
              <select
                value={criticality}
                onChange={(e) =>
                  setCriticality(
                    e.target.value as "CRITICAL" | "STANDARD" | "OPTIONAL",
                  )
                }
                disabled={pending}
              >
                <option value="CRITICAL">Critical</option>
                <option value="STANDARD">Standard</option>
                <option value="OPTIONAL">Optional</option>
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={pending || !roleLabel.trim()}
              onClick={() =>
                run(async () => {
                  await patchAction("requirement", {
                    roleLabel: roleLabel.trim(),
                    requiredCount: Number(requiredCount),
                    minimumCount: Number(minimumCount),
                    criticality,
                  });
                  setRoleLabel("");
                  setMessage("Requirement saved.");
                })
              }
            >
              Save requirement
            </button>
          </section>

          <section className="panel" aria-labelledby="staffing-assign-h">
            <h2 id="staffing-assign-h">Assign volunteer</h2>
            <p className="muted" role="note">
              Explicit operator assignment only — never auto-assign from RSVP or
              name match.
            </p>
            <label>
              Requirement
              <select
                value={
                  assignRequirementId ||
                  model.plan.requirements[0]?.id ||
                  ""
                }
                onChange={(e) => setAssignRequirementId(e.target.value)}
                disabled={pending}
              >
                {model.plan.requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roleLabel}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target type
              <select
                value={targetType}
                onChange={(e) =>
                  setTargetType(
                    e.target.value as MissionStaffingAssignmentTargetType,
                  )
                }
                disabled={pending}
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            {targetType === "MANUAL_SCOPED" ? (
              <label>
                Display label
                <input
                  value={manualDisplayLabel}
                  onChange={(e) => setManualDisplayLabel(e.target.value)}
                  disabled={pending}
                />
              </label>
            ) : null}
            {targetType === "CAMPAIGN_USER" ? (
              <label>
                Campaign user ID
                <input
                  value={campaignUserId}
                  onChange={(e) => setCampaignUserId(e.target.value)}
                  disabled={pending}
                />
              </label>
            ) : null}
            {targetType === "LOCAL_PERSON" ? (
              <label>
                Local person ID
                <input
                  value={localPersonId}
                  onChange={(e) => setLocalPersonId(e.target.value)}
                  disabled={pending}
                />
              </label>
            ) : null}
            {targetType === "CONFIRMED_EXTERNAL_REF" ? (
              <label>
                Confirmed external person ID
                <input
                  value={confirmedExternalPersonId}
                  onChange={(e) => setConfirmedExternalPersonId(e.target.value)}
                  disabled={pending}
                />
              </label>
            ) : null}
            <button
              type="button"
              className="button"
              disabled={pending || !assignRequirementId}
              onClick={() =>
                run(async () => {
                  await patchAction("assign", {
                    requirementId: assignRequirementId,
                    targetType,
                    manualDisplayLabel: manualDisplayLabel.trim() || null,
                    campaignUserId: campaignUserId.trim() || null,
                    localPersonId: localPersonId.trim() || null,
                    confirmedExternalPersonId:
                      confirmedExternalPersonId.trim() || null,
                  });
                  setManualDisplayLabel("");
                  setCampaignUserId("");
                  setLocalPersonId("");
                  setConfirmedExternalPersonId("");
                  setMessage("Assignment created.");
                })
              }
            >
              Create assignment
            </button>
          </section>

          <section className="panel" aria-labelledby="staffing-assignments-h">
            <h2 id="staffing-assignments-h">Assignments</h2>
            {model.plan.assignments.length === 0 ? (
              <p className="muted">No assignments yet.</p>
            ) : (
              <ul className="briefing-list">
                {model.plan.assignments.map((a) => (
                  <li key={a.id}>
                    <h3>
                      {a.displayLabel} ·{" "}
                      {requirementsById.get(a.requirementId) ?? "Role"}
                    </h3>
                    <p className="muted">
                      Status: {labelStaffingAssignmentStatus(a.status)} ·{" "}
                      {a.targetType.replace(/_/g, " ")}
                      {a.hasMobilizeLink ? " · Mobilize linked" : ""}
                    </p>
                    <div className="closeout-button-row">
                      {allowedTransitions(a.status).map((toStatus) => (
                        <button
                          key={toStatus}
                          type="button"
                          className="button secondary"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              await patchAction("transition", {
                                assignmentId: a.id,
                                status: toStatus,
                              });
                              setMessage(
                                `Recorded ${TRANSITION_LABELS[toStatus] ?? labelStaffingAssignmentStatus(toStatus)}.`,
                              );
                            })
                          }
                        >
                          {TRANSITION_LABELS[toStatus] ??
                            labelStaffingAssignmentStatus(toStatus)}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="staffing-confirm-h">
            <h2 id="staffing-confirm-h">Confirm plan</h2>
            <p className="muted">
              Confirms staffing against current schedule and assignments.
              Blockers may keep the plan in progress.
            </p>
            {model.launchBlockers.length > 0 ? (
              <p role="note">
                {model.launchBlockers.length} launch blocker(s) remain open.
              </p>
            ) : null}
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await patchAction("confirm", {});
                  setMessage("Staffing plan confirmed.");
                })
              }
            >
              Confirm staffing plan
            </button>
          </section>
        </>
      ) : null}

      {message ? (
        <p className="closeout-save-status" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="closeout-save-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? <p className="muted">Working…</p> : null}
    </article>
  );
}
