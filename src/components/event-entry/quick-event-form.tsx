"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PRIMARY_CALENDARS,
  eventTypesForCalendar,
} from "@/features/event-drafts/arkansas-counties";
import { EventTemplatePicker } from "@/components/event-entry/event-template-picker";
import { getPreset } from "@/features/event-drafts/event-presets";
import {
  chicagoWallTimeToUtc,
  endsAtFromStartAndDuration,
} from "@/lib/calendar/event-wall-time";

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

type CalendarRow = { id: string; name: string };

/**
 * Quick create — writes a canonical Event (not filesystem draft).
 */
export function QuickEventForm() {
  const router = useRouter();
  const [primaryCalendar, setPrimaryCalendar] = useState<string>("Public Events");
  const [eventType, setEventType] = useState("Community meeting");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(chicagoToday());
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("1 hour");
  const [city, setCity] = useState("");
  const [venueName, setVenueName] = useState("");
  const [visibility, setVisibility] = useState("TITLE_LOCATION");
  const [asDraft, setAsDraft] = useState(false);
  const [weeklyOccurrences, setWeeklyOccurrences] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
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

  async function resolveCalendarId(): Promise<string> {
    const res = await fetch("/api/calendars");
    const json = (await res.json()) as { calendars?: CalendarRow[] };
    const calendars = json.calendars ?? [];
    const match =
      calendars.find((c) => c.name === primaryCalendar) ||
      calendars.find((c) =>
        c.name.toLowerCase().includes(primaryCalendar.split(" ")[0].toLowerCase()),
      ) ||
      calendars[0];
    if (!match) throw new Error("No calendars available. Seed calendars first.");
    return match.id;
  }

  async function createLiveEvent() {
    if (!title.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const primaryCalendarId = await resolveCalendarId();
      const startsAt = chicagoWallTimeToUtc(date, startTime);
      const endsAt = endsAtFromStartAndDuration(startsAt, duration);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryCalendarId,
          internalTitle: title.trim(),
          campaignDisplayTitle: title.trim(),
          eventType,
          status: asDraft ? "DRAFT" : "CONFIRMED",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          timezone: "America/Chicago",
          city: city.trim() || undefined,
          venueName: venueName.trim() || undefined,
          defaultVisibility: visibility,
          locationDisclosure: "CITY",
          weeklyOccurrences: weeklyOccurrences > 1 ? weeklyOccurrences : undefined,
          isRecurring: weeklyOccurrences > 1,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        event?: { eventId?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.event?.eventId) {
        throw new Error(json.error?.message ?? "Could not create event.");
      }
      router.push(`/events/${json.event.eventId}/edit`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed.");
      setSaving(false);
    }
  }

  return (
    <div className="page-stack event-quick-create">
      <header className="page-header">
        <h1>Add event</h1>
        <p className="executive-question">Place something on the calendar quickly.</p>
        <p className="muted">
          Writes the canonical Event · progressive detail on the next screen ·{" "}
          <Link href="/add/full">Full planner draft</Link> still available for staging.
        </p>
      </header>

      <EventTemplatePicker onSelect={applyPreset} />

      <section className="panel">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Coffee with Chamber"
            required
          />
        </label>
        <label>
          Calendar
          <select
            value={primaryCalendar}
            onChange={(e) => setPrimaryCalendar(e.target.value)}
          >
            {PRIMARY_CALENDARS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="quick-date-chips">
          {QUICK_DATES.map((label) => (
            <button
              key={label}
              type="button"
              className="chip chip-link"
              onClick={() => applyQuickDate(label)}
            >
              {label}
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
        <label>
          Duration
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Venue
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Little Rock"
          />
        </label>
        <label>
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="TITLE_LOCATION">Title + location</option>
            <option value="FULL">Full</option>
            <option value="BUSY_ONLY">Busy only</option>
            <option value="TEAM_ONLY">Team only</option>
            <option value="LEADERSHIP_ONLY">Leadership only</option>
            <option value="PROTECTED">Protected</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={asDraft}
            onChange={(e) => setAsDraft(e.target.checked)}
          />{" "}
          Save as draft (not yet confirmed on calendar)
        </label>
        <label>
          Weekly repeats (optional)
          <select
            value={weeklyOccurrences}
            onChange={(e) => setWeeklyOccurrences(Number(e.target.value))}
          >
            <option value={0}>No repeat</option>
            <option value={2}>2 weeks</option>
            <option value={4}>4 weeks</option>
            <option value={8}>8 weeks</option>
          </select>
        </label>
        {weeklyOccurrences > 1 ? (
          <p className="muted">
            Creates separate Event rows in one series. Editing a series later will warn
            before changing multiple occurrences.
          </p>
        ) : null}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => void createLiveEvent()}
          >
            {saving ? "Creating…" : asDraft ? "Save draft event" : "Create & schedule"}
          </button>
          <Link href="/">Cancel</Link>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>
    </div>
  );
}
