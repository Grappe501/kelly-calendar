"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CampaignDayCloseoutViewModel } from "@/lib/missions/v21/day-closeout";

type Props = {
  dateKey: string;
  expectedUpdatedAt: string | null;
  reviewBlockers: string[];
  signoffBlockers: string[];
  status: string;
  exists: boolean;
  closeoutSummary: string | null;
  tomorrowSummary: string | null;
  carryForwardSummary: string | null;
  internalNotes: string | null;
  todayAssessment: string;
  tomorrowReadiness: string;
  suggested: CampaignDayCloseoutViewModel["suggestedCarryForward"];
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

export function CloseoutActions({
  dateKey,
  expectedUpdatedAt,
  reviewBlockers,
  signoffBlockers,
  status,
  exists,
  closeoutSummary,
  tomorrowSummary,
  carryForwardSummary,
  internalNotes,
  todayAssessment,
  tomorrowReadiness,
  suggested,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(closeoutSummary ?? "");
  const [tomorrow, setTomorrow] = useState(tomorrowSummary ?? "");
  const [carrySummary, setCarrySummary] = useState(carryForwardSummary ?? "");
  const [notes, setNotes] = useState(internalNotes ?? "");
  const [assessment, setAssessment] = useState(todayAssessment);
  const [readiness, setReadiness] = useState(tomorrowReadiness);

  const base = `/api/briefing/${dateKey}/closeout`;

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
    <div className="closeout-actions no-print">
      <div className="closeout-forms panel">
        <h2>Day assessment and summaries</h2>
        <label>
          Today assessment
          <select
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            disabled={pending || status === "SIGNED_OFF"}
          >
            <option value="NOT_ASSESSED">Not assessed</option>
            <option value="CLEAR">Clear</option>
            <option value="RESPONSIBILITY_REMAINS">Responsibility remains</option>
            <option value="LEADERSHIP_ACTION_REQUIRED">
              Leadership action required
            </option>
          </select>
        </label>
        <label>
          Tomorrow readiness
          <select
            value={readiness}
            onChange={(e) => setReadiness(e.target.value)}
            disabled={pending || status === "SIGNED_OFF"}
          >
            <option value="NOT_ASSESSED">Not assessed</option>
            <option value="READY">Ready</option>
            <option value="NEEDS_ATTENTION">Needs attention</option>
            <option value="NOT_READY">Not ready</option>
            <option value="NO_MISSIONS_SCHEDULED">No Missions scheduled</option>
          </select>
        </label>
        <label>
          Closeout summary
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={pending || status === "SIGNED_OFF"}
          />
        </label>
        <label>
          Tomorrow summary
          <textarea
            value={tomorrow}
            onChange={(e) => setTomorrow(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={pending || status === "SIGNED_OFF"}
          />
        </label>
        <label>
          Carry-forward summary
          <textarea
            value={carrySummary}
            onChange={(e) => setCarrySummary(e.target.value)}
            rows={2}
            maxLength={2000}
            disabled={pending || status === "SIGNED_OFF"}
          />
        </label>
        <label>
          Internal notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={4000}
            disabled={pending || status === "SIGNED_OFF"}
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
                  setMessage("Day closeout started.");
                })
              }
            >
              Begin Day Closeout
            </button>
          ) : null}
          <button
            type="button"
            className="button secondary"
            disabled={pending || status === "SIGNED_OFF"}
            onClick={() =>
              run(async () => {
                await patchJson(base, {
                  expectedUpdatedAt,
                  todayAssessment: assessment,
                  tomorrowReadiness: readiness,
                  closeoutSummary: summary,
                  tomorrowSummary: tomorrow,
                  carryForwardSummary: carrySummary,
                  internalNotes: notes,
                });
                setMessage("Saved.");
              })
            }
          >
            Save assessments
          </button>
        </div>
      </div>

      {suggested.filter((s) => !s.alreadyPresent).length > 0 ? (
        <div className="panel">
          <h2>Suggested carry-forward</h2>
          <p className="muted">
            Suggestions are not created automatically. Confirm deliberately.
          </p>
          <ul className="briefing-list">
            {suggested
              .filter((s) => !s.alreadyPresent)
              .slice(0, 10)
              .map((s) => (
                <li key={s.suggestionKey}>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.reason}</p>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending || status === "SIGNED_OFF"}
                    onClick={() =>
                      run(async () => {
                        const result = await postJson(`${base}/carry-forward`, {
                          sourceType: s.sourceType,
                          sourceRecordId: s.sourceRecordId,
                          missionId: s.missionId,
                          title: s.title,
                          reason: s.reason,
                          ownerName: s.ownerName,
                          destination: s.destination,
                        });
                        setMessage(
                          `${result.added} added · ${result.alreadyPresent} already present`,
                        );
                      })
                    }
                  >
                    Confirm Carry-Forward
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <div className="panel closeout-final">
        <h2>Complete review and signoff</h2>
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
            status === "SIGNED_OFF" ||
            status === "REVIEWED" ||
            reviewBlockers.length > 0
          }
          onClick={() =>
            run(async () => {
              await postJson(`${base}/review`, {
                expectedUpdatedAt,
                todayAssessment: assessment,
                tomorrowReadiness: readiness,
                closeoutSummary: summary,
                tomorrowSummary: tomorrow,
                carryForwardSummary: carrySummary,
                internalNotes: notes,
              });
              setMessage("Day review completed. Signoff is still separate.");
            })
          }
        >
          Complete Day Review
        </button>

        <p className="muted">
          Signoff confirms the day has been responsibly reviewed. It does not
          mark unresolved Mission work complete.
        </p>
        {signoffBlockers.length > 0 ? (
          <ul>
            {signoffBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          className="button"
          disabled={
            pending || status !== "REVIEWED" || signoffBlockers.length > 0
          }
          onClick={() => {
            const ok = window.confirm(
              "Sign off on this campaign day? This does not complete underlying Mission work.",
            );
            if (!ok) return;
            run(async () => {
              await postJson(`${base}/signoff`, {
                expectedUpdatedAt,
                confirm: true,
              });
              setMessage("Day signed off.");
            });
          }}
        >
          Sign Off on Day
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
