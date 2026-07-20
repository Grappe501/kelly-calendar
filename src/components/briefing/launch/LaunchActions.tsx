"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CampaignDayLaunchReviewViewModel } from "@/lib/missions/v21/day-launch";

type Props = {
  dateKey: string;
  expectedUpdatedAt: string | null;
  status: string;
  exists: boolean;
  reviewBlockers: string[];
  launchBlockers: string[];
  launchSummary: string | null;
  overnightChangeNotes: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  readinessAssessment: string;
  overnightChanges: CampaignDayLaunchReviewViewModel["overnightChanges"];
  blockingConditions: CampaignDayLaunchReviewViewModel["blockingConditions"];
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Request failed.");
  }
  return json;
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Request failed.");
  }
  return json;
}

export function LaunchActions({
  dateKey,
  expectedUpdatedAt,
  status,
  exists,
  reviewBlockers,
  launchBlockers,
  launchSummary,
  overnightChangeNotes,
  acceptedRiskSummary,
  internalNotes,
  readinessAssessment,
  overnightChanges,
  blockingConditions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(launchSummary ?? "");
  const [overnight, setOvernight] = useState(overnightChangeNotes ?? "");
  const [riskSummary, setRiskSummary] = useState(acceptedRiskSummary ?? "");
  const [notes, setNotes] = useState(internalNotes ?? "");
  const [readiness, setReadiness] = useState(readinessAssessment);

  const base = `/api/briefing/${dateKey}/launch`;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    }
  }

  return (
    <div className="launch-actions no-print">
      <div className="panel">
        <h2>Launch assessment</h2>
        <label>
          Readiness assessment
          <select
            value={readiness}
            onChange={(e) => setReadiness(e.target.value)}
            disabled={pending || status === "LAUNCHED"}
          >
            <option value="NOT_ASSESSED">Not assessed</option>
            <option value="READY">Ready</option>
            <option value="READY_WITH_ACCEPTED_RISK">
              Ready with accepted risk
            </option>
            <option value="NOT_READY">Not ready</option>
            <option value="NO_MISSIONS_SCHEDULED">No Missions scheduled</option>
          </select>
        </label>
        <label>
          Launch summary
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            maxLength={1500}
            disabled={pending || status === "LAUNCHED"}
          />
        </label>
        <label>
          Overnight change notes
          <textarea
            value={overnight}
            onChange={(e) => setOvernight(e.target.value)}
            rows={2}
            maxLength={1500}
            disabled={pending || status === "LAUNCHED"}
          />
        </label>
        <label>
          Accepted risk summary
          <textarea
            value={riskSummary}
            onChange={(e) => setRiskSummary(e.target.value)}
            rows={2}
            maxLength={1500}
            disabled={pending || status === "LAUNCHED"}
          />
        </label>
        <label>
          Internal notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={4000}
            disabled={pending || status === "LAUNCHED"}
          />
        </label>
        <div className="closeout-button-row">
          {!exists || status === "NOT_STARTED" ? (
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await postJson(`${base}/start`, {});
                  setMessage("Morning review started.");
                })
              }
            >
              Begin Morning Review
            </button>
          ) : null}
          <button
            type="button"
            className="button secondary"
            disabled={pending || status === "LAUNCHED"}
            onClick={() =>
              run(async () => {
                await patchJson(base, {
                  expectedUpdatedAt,
                  readinessAssessment: readiness,
                  launchSummary: summary,
                  overnightChangeNotes: overnight,
                  acceptedRiskSummary: riskSummary,
                  internalNotes: notes,
                });
                setMessage("Saved.");
              })
            }
          >
            Save assessment
          </button>
        </div>
      </div>

      {(overnightChanges.length > 0 || blockingConditions.length > 0) &&
      status !== "LAUNCHED" ? (
        <div className="panel">
          <h2>Acknowledge changes and blockers</h2>
          <p className="muted">
            Acknowledgement is day-level review metadata. It does not resolve
            underlying Mission work.
          </p>
          <ul className="briefing-list">
            {[...overnightChanges, ...blockingConditions]
              .filter(
                (item) =>
                  !item.acknowledgementStatus ||
                  item.acknowledgementStatus === "OPEN",
              )
              .filter(
                (item, index, arr) =>
                  arr.findIndex(
                    (x) =>
                      x.acknowledgementImportKey ===
                      item.acknowledgementImportKey,
                  ) === index,
              )
              .slice(0, 12)
              .map((item) => {
                const isBlocker = "explanation" in item && !("category" in item);
                const title = item.title;
                const importKey = item.acknowledgementImportKey;
                return (
                  <li key={importKey}>
                    <h3>{title}</h3>
                    <div className="closeout-button-row">
                      <button
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const result = await postJson(
                              `${base}/acknowledgements`,
                              {
                                acknowledgementType: isBlocker
                                  ? "FIRST_MISSION_PREPARATION"
                                  : "OVERNIGHT_CHANGE",
                                sourceType: "COMMAND_CENTER_RULE",
                                sourceRecordId: importKey,
                                importKey,
                                missionId:
                                  "missionId" in item ? item.missionId : null,
                                title,
                                status: "ACKNOWLEDGED",
                              },
                            );
                            setMessage(
                              `${result.added} added · ${result.alreadyPresent} already present`,
                            );
                          })
                        }
                      >
                        Acknowledge
                      </button>
                      {isBlocker ? (
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
                              const result = await postJson(
                                `${base}/acknowledgements`,
                                {
                                  acknowledgementType: "FIRST_MISSION_PREPARATION",
                                  sourceType: "COMMAND_CENTER_RULE",
                                  sourceRecordId: importKey,
                                  importKey,
                                  missionId: item.missionId,
                                  title,
                                  status: "ACCEPTED_RISK",
                                  acceptedRiskReason: reason.trim(),
                                },
                              );
                              setMessage(
                                `${result.added} added · ${result.alreadyPresent} already present`,
                              );
                            });
                          }}
                        >
                          Accept risk
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}

      <div className="panel closeout-final">
        <h2>Complete review and launch</h2>
        {reviewBlockers.length > 0 ? (
          <ul>
            {reviewBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No review blockers from current rules.</p>
        )}
        <button
          type="button"
          className="button"
          disabled={
            pending ||
            status === "LAUNCHED" ||
            status === "REVIEWED" ||
            reviewBlockers.length > 0
          }
          onClick={() =>
            run(async () => {
              await postJson(`${base}/review`, {
                expectedUpdatedAt,
                readinessAssessment: readiness,
                launchSummary: summary,
                overnightChangeNotes: overnight,
                acceptedRiskSummary: riskSummary,
                internalNotes: notes,
              });
              setMessage("Morning review completed. Launch is still separate.");
            })
          }
        >
          Complete Morning Review
        </button>

        <p className="muted">
          Launch authorizes the campaign to begin the day. It does not start
          Mission execution or mark Mission work complete.
        </p>
        {launchBlockers.length > 0 ? (
          <ul>
            {launchBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="button"
          disabled={
            pending || status !== "REVIEWED" || launchBlockers.length > 0
          }
          onClick={() => {
            const ok = window.confirm(
              "Launch the campaign day? This does not start Mission execution.",
            );
            if (!ok) return;
            run(async () => {
              await postJson(`${base}/launch-day`, {
                expectedUpdatedAt,
                confirm: true,
              });
              setMessage("Campaign day launched.");
            });
          }}
        >
          Launch Campaign Day
        </button>
      </div>

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
      {pending ? <p className="muted">Saving…</p> : null}
    </div>
  );
}
