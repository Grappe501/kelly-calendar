"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RULE_TYPES = [
  "GENERAL_AVAILABILITY",
  "PREFERRED_WINDOW",
  "UNAVAILABLE_WINDOW",
  "PROTECTED_WORK",
  "OFFICE_HOURS",
  "TRAVEL_BUFFER",
  "PREPARATION_BUFFER",
  "RECOVERY_BUFFER",
  "VACATION",
  "BLACKOUT",
  "OTHER",
] as const;

const CLASSIFICATIONS = [
  "AVAILABLE",
  "PREFERRED",
  "CONSTRAINED",
  "UNAVAILABLE",
  "UNKNOWN",
  "REQUIRES_REVIEW",
] as const;

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function NewAvailabilityRuleForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [ruleType, setRuleType] = useState<(typeof RULE_TYPES)[number]>("PROTECTED_WORK");
  const [classification, setClassification] =
    useState<(typeof CLASSIFICATIONS)[number]>("CONSTRAINED");
  const [effectiveStartDate, setEffectiveStartDate] = useState("2025-11-01");
  const [effectiveEndDate, setEffectiveEndDate] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startLocalTime, setStartLocalTime] = useState("08:00");
  const [endLocalTime, setEndLocalTime] = useState("17:00");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(0);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(0);
  const [priority, setPriority] = useState(50);
  const [locationHint, setLocationHint] = useState("");
  const [reasonSensitive, setReasonSensitive] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggleWeekday(v: number) {
    setWeekdays((prev) => (prev.includes(v) ? prev.filter((w) => w !== v) : [...prev, v].sort()));
  }

  async function submit() {
    if (!label.trim()) {
      setMessage("Label is required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/availability/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          ruleType,
          classification,
          effectiveStartDate,
          effectiveEndDate: effectiveEndDate || null,
          startLocalTime: allDay ? null : startLocalTime,
          endLocalTime: allDay ? null : endLocalTime,
          weekdays,
          bufferBeforeMinutes,
          bufferAfterMinutes,
          priority,
          locationHint: locationHint.trim() || null,
          reasonSensitive: reasonSensitive.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create rule.");
      router.push(`/system/calendar/availability/rules/${json.rule.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed.");
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>New standing availability rule</h1>
        <p className="muted">
          Created as DRAFT — approve it from the rule page before it applies to
          evaluations. <Link href="/system/calendar/availability">Back to rules</Link>
        </p>
      </header>

      <section className="panel">
        <label>
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          Rule type
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as (typeof RULE_TYPES)[number])}
          >
            {RULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Classification
          <select
            value={classification}
            onChange={(e) =>
              setClassification(e.target.value as (typeof CLASSIFICATIONS)[number])
            }
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Effective start date
          <input
            type="date"
            value={effectiveStartDate}
            onChange={(e) => setEffectiveStartDate(e.target.value)}
          />
        </label>
        <label>
          Effective end date (optional)
          <input
            type="date"
            value={effectiveEndDate}
            onChange={(e) => setEffectiveEndDate(e.target.value)}
          />
        </label>
        <label>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />{" "}
          All-day (no local start/end time)
        </label>
        {!allDay ? (
          <>
            <label>
              Start local time
              <input
                type="time"
                value={startLocalTime}
                onChange={(e) => setStartLocalTime(e.target.value)}
              />
            </label>
            <label>
              End local time
              <input
                type="time"
                value={endLocalTime}
                onChange={(e) => setEndLocalTime(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <fieldset>
          <legend>Weekdays (none selected = every day in range)</legend>
          {WEEKDAYS.map((w) => (
            <label key={w.value} style={{ display: "inline-block", marginRight: "0.75rem" }}>
              <input
                type="checkbox"
                checked={weekdays.includes(w.value)}
                onChange={() => toggleWeekday(w.value)}
              />{" "}
              {w.label}
            </label>
          ))}
        </fieldset>
        <label>
          Buffer before (minutes)
          <input
            type="number"
            min={0}
            value={bufferBeforeMinutes}
            onChange={(e) => setBufferBeforeMinutes(Number(e.target.value))}
          />
        </label>
        <label>
          Buffer after (minutes)
          <input
            type="number"
            min={0}
            value={bufferAfterMinutes}
            onChange={(e) => setBufferAfterMinutes(Number(e.target.value))}
          />
        </label>
        <label>
          Priority (lower = more specific)
          <input
            type="number"
            min={1}
            max={100}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </label>
        <label>
          Location hint (optional, public-safe)
          <input value={locationHint} onChange={(e) => setLocationHint(e.target.value)} />
        </label>
        <label>
          Operator reason (sensitive — not shown to viewers)
          <textarea
            value={reasonSensitive}
            onChange={(e) => setReasonSensitive(e.target.value)}
            rows={2}
          />
        </label>
        <div className="form-actions">
          <button type="button" className="button" disabled={busy} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create rule (DRAFT)"}
          </button>
          <Link href="/system/calendar/availability">Cancel</Link>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>
    </div>
  );
}
