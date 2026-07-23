"use client";

import { useState } from "react";
import Link from "next/link";

type Workspace = {
  eligibility: { eligibility: string; reason: string };
  indicator: string | null;
  event: {
    id: string;
    eventNumber: string;
    title: string;
    status: string;
    endsAt: string;
    mission: { id: string } | null;
  };
  review: {
    id: string;
    status: string;
    attendanceOutcome: string | null;
    operationalOutcome: string | null;
    whatHappened: string | null;
    summary: string | null;
    attendanceEstimate: number | null;
    followUpNeeded: boolean;
    missionWorkNeeded: boolean;
    hotWash: Array<{
      id: string;
      entryType: string;
      content: string;
      authorUserId: string | null;
      createdAt: string;
    }>;
    encounters: Array<{
      id: string;
      displayName: string;
      organizationName: string | null;
      contactReviewStatus: string;
    }>;
  } | null;
  guarantees: Record<string, boolean>;
};

const ATTENDANCE = [
  "ATTENDED",
  "PARTIALLY_ATTENDED",
  "NOT_ATTENDED",
  "CANCELLED",
  "POSTPONED",
  "EVENT_DID_NOT_OCCUR",
  "UNKNOWN",
  "NOT_APPLICABLE",
] as const;

const OPERATIONAL = [
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "UNSUCCESSFUL",
  "RESCHEDULE_NEEDED",
  "FOLLOW_UP_REQUIRED",
  "NO_CAMPAIGN_ACTION",
  "UNKNOWN",
] as const;

export function EventOutcomeHotWashClient({
  eventId,
  initial,
}: {
  eventId: string;
  initial: Workspace;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const [step, setStep] = useState(1);
  const [attendance, setAttendance] = useState(
    workspace.review?.attendanceOutcome ?? "",
  );
  const [operational, setOperational] = useState(
    workspace.review?.operationalOutcome ?? "",
  );
  const [whatHappened, setWhatHappened] = useState(
    workspace.review?.whatHappened ?? "",
  );
  const [takeaway, setTakeaway] = useState("");
  const [encounterName, setEncounterName] = useState("");
  const [commitment, setCommitment] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [confirmFollowUp, setConfirmFollowUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function api(
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ) {
    setBusy(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || data?.message || `HTTP ${res.status}`);
        return null;
      }
      if (data?.eligibility || data?.review !== undefined) {
        setWorkspace(data as Workspace);
      }
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — draft not lost.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(complete = false) {
    const data = await api(`/api/events/${eventId}/outcome`, "PATCH", {
      attendanceOutcome: attendance || null,
      operationalOutcome: operational || null,
      whatHappened: whatHappened || null,
      followUpNeeded: Boolean(followUpTitle) || workspace.review?.followUpNeeded,
      completeReview: complete,
    });
    if (data) setSavedMsg(complete ? "Review completed." : "Draft saved.");
  }

  async function addTakeaway() {
    if (!takeaway.trim()) return;
    const data = await api(`/api/events/${eventId}/hot-wash`, "POST", {
      entryType: "TAKEAWAY",
      content: takeaway.trim(),
    });
    if (data) {
      setTakeaway("");
      setSavedMsg("Takeaway recorded.");
    }
  }

  async function addEncounter() {
    if (!encounterName.trim()) return;
    const data = await api(`/api/events/${eventId}/encounters`, "POST", {
      displayName: encounterName.trim(),
      autoMatchByName: false,
    });
    if (data) {
      setEncounterName("");
      setSavedMsg("Encounter noted (no Person created).");
    }
  }

  async function addCommitment() {
    if (!commitment.trim()) return;
    const data = await api(`/api/events/${eventId}/hot-wash`, "POST", {
      entryType: "COMMITMENT",
      content: commitment.trim(),
    });
    if (data) {
      setCommitment("");
      setSavedMsg("Commitment recorded.");
    }
  }

  async function createFollowUp() {
    if (!confirmFollowUp) {
      setError("Confirm follow-up creation before submitting.");
      return;
    }
    const data = await api(
      `/api/events/${eventId}/outcome/follow-up`,
      "POST",
      {
        title: followUpTitle || "Follow-up from hot wash",
        confirmFollowUp: true,
      },
    );
    if (data) {
      setFollowUpTitle("");
      setConfirmFollowUp(false);
      setSavedMsg("Follow-up created (hot wash not auto-completed).");
    }
  }

  const elig = workspace.eligibility.eligibility;

  return (
    <div className="page-stack event-outcome-mobile">
      <header className="page-header">
        <p className="eyebrow">Event outcome · Hot wash</p>
        <h1>{workspace.event.title}</h1>
        <p>
          {workspace.event.eventNumber} · Eligibility: <strong>{elig}</strong>
          {workspace.indicator ? ` · ${workspace.indicator}` : ""}
        </p>
        <p className="muted">{workspace.eligibility.reason}</p>
      </header>

      <nav className="button-row" aria-label="Hot wash steps">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            type="button"
            className={step === n ? "button" : "button secondary"}
            onClick={() => setStep(n)}
            aria-current={step === n ? "step" : undefined}
            style={{ minHeight: 44, minWidth: 44 }}
          >
            {n}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="panel" role="alert">
          <p>{error}</p>
        </div>
      ) : null}
      {savedMsg ? (
        <div className="panel" role="status">
          <p>{savedMsg}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <section className="panel" aria-labelledby="step-attend">
          <h2 id="step-attend">1. Did we attend?</h2>
          <p className="muted">
            Time passing does not mark attendance. Choose explicitly.
          </p>
          <label htmlFor="attendance">Attendance outcome</label>
          <select
            id="attendance"
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
            style={{ minHeight: 48, width: "100%" }}
          >
            <option value="">Select…</option>
            {ATTENDANCE.map((a) => (
              <option key={a} value={a}>
                {a.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <label htmlFor="operational" style={{ marginTop: 12, display: "block" }}>
            Operational outcome
          </label>
          <select
            id="operational"
            value={operational}
            onChange={(e) => setOperational(e.target.value)}
            style={{ minHeight: 48, width: "100%" }}
          >
            <option value="">Select…</option>
            {OPERATIONAL.map((a) => (
              <option key={a} value={a}>
                {a.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <p className="muted" style={{ marginTop: 8 }}>
            Attended ≠ Completed. Not attended ≠ Event did not occur ≠ Cancelled.
          </p>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel" aria-labelledby="step-what">
          <h2 id="step-what">2. What happened?</h2>
          <label htmlFor="what">Summary of what occurred</label>
          <textarea
            id="what"
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={6}
            style={{ width: "100%", minHeight: 120 }}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel" aria-labelledby="step-take">
          <h2 id="step-take">3. Top takeaways</h2>
          <label htmlFor="takeaway">Add takeaway</label>
          <textarea
            id="takeaway"
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
          <button
            type="button"
            className="button"
            style={{ minHeight: 48, marginTop: 8 }}
            disabled={busy}
            onClick={() => void addTakeaway()}
          >
            Append takeaway
          </button>
          <ul>
            {(workspace.review?.hotWash ?? [])
              .filter((h) => h.entryType === "TAKEAWAY")
              .map((h) => (
                <li key={h.id}>{h.content}</li>
              ))}
          </ul>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="panel" aria-labelledby="step-met">
          <h2 id="step-met">4. Who did we meet?</h2>
          <p className="muted">
            A name alone does not create a Person, consent, or communication.
          </p>
          <label htmlFor="encounter">Display name</label>
          <input
            id="encounter"
            value={encounterName}
            onChange={(e) => setEncounterName(e.target.value)}
            style={{ minHeight: 48, width: "100%" }}
          />
          <button
            type="button"
            className="button"
            style={{ minHeight: 48, marginTop: 8 }}
            disabled={busy}
            onClick={() => void addEncounter()}
          >
            Record encounter
          </button>
          <ul>
            {(workspace.review?.encounters ?? []).map((e) => (
              <li key={e.id}>
                {e.displayName}
                {e.organizationName ? ` · ${e.organizationName}` : ""} ·{" "}
                {e.contactReviewStatus}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="panel" aria-labelledby="step-promise">
          <h2 id="step-promise">5. What did we promise?</h2>
          <label htmlFor="commitment">Commitment</label>
          <textarea
            id="commitment"
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
          <button
            type="button"
            className="button"
            style={{ minHeight: 48, marginTop: 8 }}
            disabled={busy}
            onClick={() => void addCommitment()}
          >
            Record commitment
          </button>
          <ul>
            {(workspace.review?.hotWash ?? [])
              .filter((h) => h.entryType === "COMMITMENT")
              .map((h) => (
                <li key={h.id}>{h.content}</li>
              ))}
          </ul>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="panel" aria-labelledby="step-fu">
          <h2 id="step-fu">6. What needs follow-up?</h2>
          <label htmlFor="fu-title">Follow-up title</label>
          <input
            id="fu-title"
            value={followUpTitle}
            onChange={(e) => setFollowUpTitle(e.target.value)}
            style={{ minHeight: 48, width: "100%" }}
          />
          <label style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={confirmFollowUp}
              onChange={(e) => setConfirmFollowUp(e.target.checked)}
              style={{ width: 24, height: 24 }}
            />
            I confirm creating a Follow-up (does not complete this hot wash)
          </label>
          <button
            type="button"
            className="button"
            style={{ minHeight: 48, marginTop: 8 }}
            disabled={busy}
            onClick={() => void createFollowUp()}
          >
            Create follow-up draft
          </button>
        </section>
      ) : null}

      {step === 7 ? (
        <section className="panel" aria-labelledby="step-done">
          <h2 id="step-done">7. Complete review</h2>
          <p>
            Completing records reviewer and time. It does not mutate Mission
            lifecycle, fabricate attendance, or send communications.
          </p>
          <button
            type="button"
            className="button"
            style={{ minHeight: 52, width: "100%" }}
            disabled={busy}
            onClick={() => void saveDraft(true)}
          >
            Complete review
          </button>
        </section>
      ) : null}

      <div className="button-row" style={{ position: "sticky", bottom: 8 }}>
        <button
          type="button"
          className="button secondary"
          style={{ minHeight: 48, flex: 1 }}
          disabled={busy}
          onClick={() => void saveDraft(false)}
        >
          Save draft
        </button>
        {step < 7 ? (
          <button
            type="button"
            className="button"
            style={{ minHeight: 48, flex: 1 }}
            onClick={() => setStep((s) => Math.min(7, s + 1))}
          >
            Next
          </button>
        ) : null}
      </div>

      <div className="button-row">
        <Link className="button secondary" href={`/events/${eventId}`}>
          Event sheet
        </Link>
        {workspace.event.mission ? (
          <Link
            className="button secondary"
            href={`/system/missions/${workspace.event.mission.id}/debrief`}
          >
            Mission debrief
          </Link>
        ) : null}
        <Link className="button secondary" href="/system/calendar/reviews">
          Review queue
        </Link>
      </div>
    </div>
  );
}
