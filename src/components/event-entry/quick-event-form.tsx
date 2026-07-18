"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PRIMARY_CALENDARS,
  eventTypesForCalendar,
} from "@/features/event-drafts/arkansas-counties";
import { DraftStatusBanner } from "@/components/event-entry/draft-status-banner";
import { AiSuggestionPanel } from "@/components/event-entry/ai-suggestion-panel";
import { EventTemplatePicker } from "@/components/event-entry/event-template-picker";
import { getPreset } from "@/features/event-drafts/event-presets";

const DURATIONS = [
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "1 hour",
  "90 minutes",
  "2 hours",
  "3 hours",
  "Half day",
  "Full day",
] as const;

const QUICK_DATES = ["Today", "Tomorrow", "This weekend", "Next week"] as const;

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function QuickEventForm() {
  const [primaryCalendar, setPrimaryCalendar] = useState<string>("Public Events");
  const [eventType, setEventType] = useState("Community meeting");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(chicagoToday());
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("1 hour");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("Hold");
  const [message, setMessage] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const types = useMemo(() => eventTypesForCalendar(primaryCalendar), [primaryCalendar]);

  function applyPreset(presetId: string) {
    const preset = getPreset(presetId);
    if (!preset) return;
    setPrimaryCalendar(preset.primaryCalendar);
    setEventType(preset.eventType);
    setDuration(preset.durationPreset);
    if (preset.defaults.basic?.campaignDisplayTitle) {
      setTitle(preset.defaults.basic.campaignDisplayTitle);
    }
    setMessage(`Template “${preset.label}” applied — still editable.`);
  }

  function applyQuickDate(label: string) {
    const today = chicagoToday();
    if (label === "Today") setDate(today);
    if (label === "Tomorrow") setDate(addDays(today, 1));
    if (label === "This weekend") {
      const d = new Date(`${today}T12:00:00`);
      const day = d.getDay();
      const toSat = (6 - day + 7) % 7 || 7;
      setDate(addDays(today, toSat));
    }
    if (label === "Next week") setDate(addDays(today, 7));
  }

  async function saveDraft() {
    setSaving(true);
    setMessage(null);
    try {
      const preset = EVENT_PRESETS_LOOKUP(primaryCalendar, eventType);
      const res = await fetch("/api/drafts/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "QUICK_DRAFT",
          basic: {
            primaryCalendar,
            additionalCalendars: [],
            eventType,
            internalTitle: title,
            campaignDisplayTitle: title,
            priority: "Normal",
            confirmationStatus: status,
          },
          timing: {
            date,
            startTime,
            durationPreset: duration,
            timezone: "America/Chicago",
          },
          location: {
            city,
            state: "Arkansas",
            locationDisclosure: "CITY",
          },
          visibility: {
            locationDisclosure: "CITY",
            generalVisibility: "Campaign-wide limited",
            showCalendarName: true,
            showSafeTitle: true,
            showGeneralLocation: true,
            showStartEnd: true,
            hideProtectedDetails: true,
            campaignDisplayTitle: title,
          },
          ...preset,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error?.message ?? "Could not save draft.");
        return;
      }
      setDraftId(json.draft.draftId);
      setMessage("Draft saved to H-drive staging. Not on the live calendar.");
    } catch {
      setMessage("Network error saving draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <DraftStatusBanner />

      <section className="panel">
        <h2>Use a template</h2>
        <EventTemplatePicker onSelect={applyPreset} />
      </section>

      <section className="panel">
        <h2>Quick entry</h2>
        <div className="form-grid">
          <label>
            Primary calendar
            <select
              value={primaryCalendar}
              onChange={(e) => {
                setPrimaryCalendar(e.target.value);
                const next = eventTypesForCalendar(e.target.value);
                setEventType(next[0] ?? "Other");
              }}
            >
              {PRIMARY_CALENDARS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            Event type
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            What? (title)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              placeholder="County Fair Appearance"
              required
            />
          </label>

          <fieldset>
            <legend>When?</legend>
            <div className="chip-row">
              {QUICK_DATES.map((d) => (
                <button key={d} type="button" className="chip-button" onClick={() => applyQuickDate(d)}>
                  {d}
                </button>
              ))}
            </div>
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <div className="chip-row" role="group" aria-label="Duration">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip-button ${duration === d ? "chip-button--active" : ""}`}
                  onClick={() => setDuration(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Where? (city)
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Little Rock"
              maxLength={120}
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Hold</option>
              <option>Tentative</option>
              <option>Confirmed</option>
              <option>Cancelled</option>
            </select>
          </label>
        </div>

        <div className="button-row" style={{ marginTop: "1rem" }}>
          <button type="button" className="button" disabled={saving || !title.trim()} onClick={saveDraft}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          <Link className="button secondary" href={draftId ? `/add/full?draftId=${draftId}` : "/add/full"}>
            Continue planning
          </Link>
          <button type="button" className="button secondary" onClick={() => setShowAi((v) => !v)}>
            Ask AI to help
          </button>
        </div>
        {message ? <p className="muted" style={{ marginTop: "0.75rem" }}>{message}</p> : null}
        {draftId ? (
          <p className="muted">
            Draft ID: <code>{draftId}</code>
          </p>
        ) : null}
      </section>

      {showAi ? <AiSuggestionPanel /> : null}
    </div>
  );
}

function EVENT_PRESETS_LOOKUP(calendar: string, eventType: string) {
  const preset = getPreset(
    calendar === "Fundraising" && eventType === "Call time"
      ? "donor_call_time"
      : calendar === "Travel"
        ? "travel_block"
        : calendar === "Protected Personal Time"
          ? "personal_protected"
          : eventType === "Festival"
            ? "festival"
            : "community_meeting",
  );
  if (!preset) return {};
  const rest = { ...preset.defaults };
  delete rest.basic;
  return rest;
}
