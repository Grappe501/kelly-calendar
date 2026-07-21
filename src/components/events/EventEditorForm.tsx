"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventEditorPayload } from "@/server/services/event-editor-service";
import {
  chicagoWallTimeToUtc,
} from "@/lib/calendar/event-wall-time";
import { chicagoDateKey } from "@/lib/calendar/chicago-date";

type HistoryPayload = {
  audits: Array<{
    id: string;
    action: string;
    reason: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    changedAt: string;
  }>;
};

type Props = {
  initial: EventEditorPayload;
  initialHistory: HistoryPayload | null;
  canMutate: boolean;
};

function toDateInput(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function toTimeInput(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "09";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function EventEditorForm({ initial, initialHistory, canMutate }: Props) {
  const router = useRouter();
  const [version, setVersion] = useState(initial.version);
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(toDateInput(initial.startsAt, initial.timezone));
  const [startTime, setStartTime] = useState(
    toTimeInput(initial.startsAt, initial.timezone),
  );
  const [endTime, setEndTime] = useState(toTimeInput(initial.endsAt, initial.timezone));
  const [venueName, setVenueName] = useState(initial.venueName ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [streetAddress, setStreetAddress] = useState(initial.streetAddress ?? "");
  const [virtualMeetingUrl, setVirtualMeetingUrl] = useState(
    initial.virtualMeetingUrl ?? "",
  );
  const [visibility, setVisibility] = useState(initial.defaultVisibility);
  const [privateNotes, setPrivateNotes] = useState(initial.privateNotes ?? "");
  const [status, setStatus] = useState(initial.status);
  const [scope, setScope] = useState<"this" | "this_and_future" | "series">("this");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState(initial.people);
  const [prep, setPrep] = useState(initial.prepActions);
  const [followUps, setFollowUps] = useState(initial.followUps);
  const [objectives, setObjectives] = useState(initial.objectives);
  const [staff, setStaff] = useState(initial.staff);
  const [history, setHistory] = useState(initialHistory);
  const [personName, setPersonName] = useState("");
  const [prepTitle, setPrepTitle] = useState("");
  const [followTitle, setFollowTitle] = useState("");
  const [objectiveTitle, setObjectiveTitle] = useState("");
  const [staffLabel, setStaffLabel] = useState("");
  const [showMore, setShowMore] = useState(false);

  async function refreshVersion(next: { version?: number; status?: string }) {
    if (typeof next.version === "number") setVersion(next.version);
    if (next.status) setStatus(next.status as typeof status);
  }

  async function saveBasics() {
    if (!canMutate) return;
    setBusy(true);
    setMessage(null);
    try {
      const startsAt = chicagoWallTimeToUtc(date, startTime);
      const endsAt = chicagoWallTimeToUtc(date, endTime);
      if (endsAt.getTime() < startsAt.getTime()) {
        throw new Error("End time must be after start time.");
      }
      if (initial.isRecurring && scope !== "this") {
        const ok = window.confirm(
          "This will change multiple occurrences in the series. Continue?",
        );
        if (!ok) {
          setBusy(false);
          return;
        }
        const res = await fetch(`/api/events/${initial.eventId}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: version,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            timezone: initial.timezone,
            scope,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Reschedule failed.");
        setMessage(`Updated ${json.updatedCount ?? 1} occurrence(s).`);
        router.refresh();
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/events/${initial.eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: version,
          internalTitle: title.trim(),
          campaignDisplayTitle: title.trim(),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          venueName: venueName.trim() || null,
          city: city.trim() || null,
          streetAddress: streetAddress.trim() || null,
          virtualMeetingUrl: virtualMeetingUrl.trim() || null,
          defaultVisibility: visibility,
          privateNotes: privateNotes.trim() || null,
          status,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed.");
      await refreshVersion({
        version: json.event?.version,
        status: status,
      });
      // Safe projection may not include version — reload editor version via editor API
      const ed = await fetch(`/api/events/${initial.eventId}/editor`);
      const edJson = await ed.json();
      if (edJson.editor?.version) setVersion(edJson.editor.version);
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(
    path: string,
    body: Record<string, unknown>,
    okMessage: string,
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Action failed.");
      setMessage(okMessage);
      const ed = await fetch(`/api/events/${initial.eventId}/editor?history=1`);
      const edJson = await ed.json();
      if (edJson.editor?.version) setVersion(edJson.editor.version);
      if (edJson.editor?.status) setStatus(edJson.editor.status);
      if (edJson.history) setHistory(edJson.history);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addDetail(op: string, payload: Record<string, string>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${initial.eventId}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not add.");
      if (op === "participant") setPeople((p) => [...p, json.item]);
      if (op === "prep") setPrep((p) => [...p, { ...json.item, phase: "PRE_EVENT", status: "NOT_STARTED" }]);
      if (op === "follow_up") setFollowUps((p) => [...p, { ...json.item, status: "NOT_STARTED" }]);
      if (op === "objective") setObjectives((p) => [...p, { ...json.item, objectiveType: "OTHER" }]);
      if (op === "staff") setStaff((p) => [...p, json.item]);
      setMessage("Added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Add failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack event-editor">
      <header className="page-header">
        <h1>Edit event</h1>
        <p className="muted">
          {initial.eventNumber} · {initial.primaryCalendar.name} · lifecycle{" "}
          {initial.operationalLifecycle} · v{version}
        </p>
        <p className="muted">
          <Link href="/">Today</Link>
          {" · "}
          <Link
            href={`/calendar?view=day&date=${chicagoDateKey(initial.startsAt)}&event=${initial.eventId}`}
          >
            Day view
          </Link>
          {" · "}
          <Link href="/add/quick">Add another</Link>
        </p>
      </header>

      <section className="panel">
        <h2>Basics</h2>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          Start
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          End
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          Venue
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!canMutate}
          />
        </label>
        <label>
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            disabled={!canMutate}
          >
            <option value="TITLE_LOCATION">Title + location</option>
            <option value="FULL">Full</option>
            <option value="BUSY_ONLY">Busy only</option>
            <option value="TEAM_ONLY">Team only</option>
            <option value="LEADERSHIP_ONLY">Leadership only</option>
            <option value="PROTECTED">Protected</option>
          </select>
        </label>
        {initial.isRecurring ? (
          <label>
            Recurring edit scope
            <select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as "this" | "this_and_future" | "series")
              }
            >
              <option value="this">This occurrence only</option>
              <option value="this_and_future">This and future</option>
              <option value="series">Entire series</option>
            </select>
          </label>
        ) : null}
        {canMutate ? (
          <button type="button" className="button" disabled={busy} onClick={() => void saveBasics()}>
            Save
          </button>
        ) : (
          <p className="muted">Read-only for your role.</p>
        )}
      </section>

      <section className="panel">
        <h2>Lifecycle actions</h2>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={!canMutate || busy || status === "CONFIRMED"}
            onClick={() =>
              void runAction(
                `/api/events/${initial.eventId}/publish`,
                { expectedVersion: version, targetStatus: "CONFIRMED" },
                "Published as confirmed.",
              )
            }
          >
            Publish / schedule
          </button>
          <button
            type="button"
            className="button"
            disabled={!canMutate || busy}
            onClick={() => {
              const reason = window.prompt("Cancel reason?");
              if (!reason?.trim()) return;
              void runAction(
                `/api/events/${initial.eventId}/cancel`,
                { expectedVersion: version, reason: reason.trim() },
                "Cancelled (history retained).",
              );
            }}
          >
            Cancel event
          </button>
          <button
            type="button"
            className="button"
            disabled={!canMutate || busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setMessage(null);
                try {
                  const res = await fetch(`/api/events/${initial.eventId}/duplicate`, {
                    method: "POST",
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error?.message ?? "Duplicate failed.");
                  if (json.event?.eventId) {
                    router.push(`/events/${json.event.eventId}/edit`);
                    return;
                  }
                  setMessage("Duplicated.");
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Duplicate failed.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="button"
            disabled={!canMutate || busy}
            onClick={() => {
              const reason = window.prompt("Archive reason?");
              if (!reason?.trim()) return;
              void runAction(
                `/api/events/${initial.eventId}/archive`,
                { expectedVersion: version, reason: reason.trim() },
                "Archived.",
              );
            }}
          >
            Archive
          </button>
        </div>
        <p className="muted">Status: {status} · No hard delete · No communications fired.</p>
      </section>

      <section className="panel">
        <button type="button" className="chip chip-link" onClick={() => setShowMore((v) => !v)}>
          {showMore ? "Hide details" : "Add progressive detail"}
        </button>
        {showMore ? (
          <div className="event-editor-details">
            <label>
              Street / address
              <input
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                disabled={!canMutate}
              />
            </label>
            <label>
              Virtual link
              <input
                value={virtualMeetingUrl}
                onChange={(e) => setVirtualMeetingUrl(e.target.value)}
                disabled={!canMutate}
                placeholder="https://"
              />
            </label>
            <label>
              Private notes
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                disabled={!canMutate}
                rows={3}
              />
            </label>

            <h3>People</h3>
            <ul>
              {people.map((p) => (
                <li key={p.id}>
                  {p.displayName} · {p.role}
                </li>
              ))}
            </ul>
            {canMutate ? (
              <div className="form-actions">
                <input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Display name"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void addDetail("participant", { displayName: personName }).then(() =>
                      setPersonName(""),
                    );
                  }}
                >
                  Add person
                </button>
              </div>
            ) : null}

            <h3>Purpose</h3>
            <ul>
              {objectives.map((o) => (
                <li key={o.id}>{o.title}</li>
              ))}
            </ul>
            {canMutate ? (
              <div className="form-actions">
                <input
                  value={objectiveTitle}
                  onChange={(e) => setObjectiveTitle(e.target.value)}
                  placeholder="Objective"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void addDetail("objective", { title: objectiveTitle }).then(() =>
                      setObjectiveTitle(""),
                    );
                  }}
                >
                  Add objective
                </button>
              </div>
            ) : null}

            <h3>Preparation</h3>
            <ul>
              {prep.map((p) => (
                <li key={p.id}>
                  {p.title} · {p.status}
                </li>
              ))}
            </ul>
            {canMutate ? (
              <div className="form-actions">
                <input
                  value={prepTitle}
                  onChange={(e) => setPrepTitle(e.target.value)}
                  placeholder="Prep item"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void addDetail("prep", { title: prepTitle }).then(() => setPrepTitle(""));
                  }}
                >
                  Add prep
                </button>
              </div>
            ) : null}

            <h3>Follow-up</h3>
            <ul>
              {followUps.map((f) => (
                <li key={f.id}>
                  {f.title} · {f.status}
                </li>
              ))}
            </ul>
            {canMutate ? (
              <div className="form-actions">
                <input
                  value={followTitle}
                  onChange={(e) => setFollowTitle(e.target.value)}
                  placeholder="Follow-up"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void addDetail("follow_up", { title: followTitle }).then(() =>
                      setFollowTitle(""),
                    );
                  }}
                >
                  Add follow-up
                </button>
              </div>
            ) : null}

            <h3>Staff</h3>
            <ul>
              {staff.map((s) => (
                <li key={s.id}>
                  {s.roleType}
                  {s.label ? ` · ${s.label}` : ""}
                </li>
              ))}
            </ul>
            {canMutate ? (
              <div className="form-actions">
                <input
                  value={staffLabel}
                  onChange={(e) => setStaffLabel(e.target.value)}
                  placeholder="Assignment note"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void addDetail("staff", { label: staffLabel }).then(() =>
                      setStaffLabel(""),
                    );
                  }}
                >
                  Assign staff role
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Audit history</h2>
        {!history ? (
          <button
            type="button"
            className="chip chip-link"
            onClick={() => {
              void fetch(`/api/events/${initial.eventId}/editor?history=1`)
                .then((r) => r.json())
                .then((j) => setHistory(j.history ?? null));
            }}
          >
            Load history
          </button>
        ) : (
          <>
            <h3>Status</h3>
            <ul>
              {history.statusHistory.map((h) => (
                <li key={h.id}>
                  {h.changedAt.slice(0, 19)} · {h.fromStatus ?? "—"} → {h.toStatus}
                  {h.reason ? ` · ${h.reason}` : ""}
                </li>
              ))}
            </ul>
            <h3>Audit</h3>
            <ul>
              {history.audits.map((a) => (
                <li key={a.id}>
                  {a.createdAt.slice(0, 19)} · {a.action}
                  {a.reason ? ` · ${a.reason}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
