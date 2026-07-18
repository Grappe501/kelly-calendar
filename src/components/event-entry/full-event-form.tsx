"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ARKANSAS_COUNTIES,
  ARKANSAS_REGIONS,
  PRIMARY_CALENDARS,
  eventTypesForCalendar,
} from "@/features/event-drafts/arkansas-counties";
import {
  EVENT_DAY_ACTIONS,
  EVENT_OBJECTIVES,
  POST_EVENT_ACTIONS,
  PRE_EVENT_ACTIONS,
  PROGRAM_FLOW_PRESETS,
  STANDARD_PACKING,
  checkboxList,
  packingList,
} from "@/features/event-drafts/checklist-presets";
import { DraftStatusBanner } from "@/components/event-entry/draft-status-banner";
import { AiSuggestionPanel } from "@/components/event-entry/ai-suggestion-panel";

type Props = { draftId?: string };

const STAFF_FLAGS: Array<{ key: string; label: string }> = [
  { key: "kellyAttending", label: "Kelly attending" },
  { key: "steveAttending", label: "Steve attending" },
  { key: "campaignManagerAttending", label: "Campaign manager attending" },
  { key: "schedulerAttending", label: "Scheduler attending" },
  { key: "communicationsNeeded", label: "Communications staff needed" },
  { key: "photographerNeeded", label: "Photographer needed" },
  { key: "videographerNeeded", label: "Videographer needed" },
  { key: "volunteerLeadNeeded", label: "Volunteer lead needed" },
  { key: "driverNeeded", label: "Driver needed" },
  { key: "advanceNeeded", label: "Advance person needed" },
  { key: "pressLiaisonNeeded", label: "Press liaison needed" },
  { key: "financeNeeded", label: "Finance representative needed" },
  { key: "complianceNeeded", label: "Compliance review needed" },
];

export function FullEventForm({ draftId: initialDraftId }: Props) {
  const [draftId, setDraftId] = useState(initialDraftId);
  const [primaryCalendar, setPrimaryCalendar] = useState("Public Events");
  const [eventType, setEventType] = useState("Community meeting");
  const [title, setTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [confirmationStatus, setConfirmationStatus] = useState("Hold");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [region, setRegion] = useState("");
  const [locationDisclosure, setLocationDisclosure] = useState("CITY");
  const [objective, setObjective] = useState("Meet voters");
  const [people, setPeople] = useState<Record<string, boolean>>({});
  const [preEvent, setPreEvent] = useState(checkboxList(PRE_EVENT_ACTIONS));
  const [eventDay, setEventDay] = useState(checkboxList(EVENT_DAY_ACTIONS));
  const [postEvent, setPostEvent] = useState(checkboxList(POST_EVENT_ACTIONS));
  const [packing, setPacking] = useState(packingList(STANDARD_PACKING));
  const [flow, setFlow] = useState(
    PROGRAM_FLOW_PRESETS.slice(0, 4).map((activity, i) => ({
      id: `flow_${i}`,
      sequence: i + 1,
      activity,
      completionStatus: "PENDING",
    })),
  );
  const [travelRequired, setTravelRequired] = useState(false);
  const [overnight, setOvernight] = useState(false);
  const [commsNeeded, setCommsNeeded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const types = useMemo(() => eventTypesForCalendar(primaryCalendar), [primaryCalendar]);

  useEffect(() => {
    if (!initialDraftId) return;
    void fetch(`/api/drafts/events/${initialDraftId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok || !json.draft) return;
        const d = json.draft;
        setTitle(d.basic.internalTitle ?? "");
        setDisplayTitle(d.basic.campaignDisplayTitle ?? "");
        setPrimaryCalendar(d.basic.primaryCalendar);
        setEventType(d.basic.eventType);
        setDate(d.timing?.date ?? "");
        setCity(d.location?.city ?? "");
        setCounty(d.location?.county ?? "");
        if (d.preEventActions?.length) setPreEvent(d.preEventActions);
        if (d.packingItems?.length) setPacking(d.packingItems);
        if (d.programFlow?.length) setFlow(d.programFlow);
      })
      .catch(() => undefined);
  }, [initialDraftId]);

  function moveFlow(index: number, dir: -1 | 1) {
    setFlow((items) => {
      const next = [...items];
      const target = index + dir;
      if (target < 0 || target >= next.length) return items;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next.map((item, i) => ({ ...item, sequence: i + 1 }));
    });
  }

  async function save(status: "PLANNING" | "READY_FOR_REVIEW" = "PLANNING") {
    setSaving(true);
    setMessage(null);
    const payload = {
      draftId,
      status,
      basic: {
        primaryCalendar,
        additionalCalendars: [],
        eventType,
        internalTitle: title,
        campaignDisplayTitle: displayTitle || title,
        priority,
        confirmationStatus,
      },
      timing: {
        date,
        startTime,
        endTime,
        allDay,
        timezone: "America/Chicago",
      },
      location: {
        venue,
        city,
        county,
        region,
        state: "Arkansas",
        locationDisclosure,
      },
      people,
      objectives: { primaryObjective: objective },
      programFlow: flow,
      packingItems: packing,
      preEventActions: preEvent,
      eventDayActions: eventDay,
      postEventActions: postEvent,
      communicationsPlan: commsNeeded
        ? [
            {
              id: "comms_1",
              channel: "Social promotion",
              status: "PENDING",
              messageObjective: "Announce appearance",
            },
          ]
        : [],
      travelPlan: {
        candidateTravelRequired: travelRequired,
        overnightStay: overnight,
        destination: city,
      },
      visibility: {
        locationDisclosure,
        generalVisibility: "Campaign-wide limited",
        showCalendarName: true,
        showSafeTitle: true,
        showGeneralLocation: locationDisclosure !== "HIDDEN",
        showStartEnd: true,
        hideProtectedDetails: true,
        campaignDisplayTitle: displayTitle || title,
      },
      staffing: [],
    };

    const nextGaps: string[] = [];
    if (people.communicationsNeeded) nextGaps.push("Communications lead unassigned");
    if (people.driverNeeded) nextGaps.push("Driver / travel lead unassigned");
    if (people.volunteerLeadNeeded) nextGaps.push("Volunteer lead unassigned");
    setGaps(nextGaps);

    try {
      const url = draftId ? `/api/drafts/events/${draftId}` : "/api/drafts/events";
      const method = draftId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json?.error?.message ?? "Save failed");
        return;
      }
      setDraftId(json.draft.draftId);
      setMessage("Planning draft saved to staging — not live.");
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <DraftStatusBanner />

      <details className="panel" open>
        <summary>
          <h2 style={{ display: "inline" }}>1. What is it?</h2>
        </summary>
        <div className="form-grid">
          <label>
            Primary calendar
            <select
              value={primaryCalendar}
              onChange={(e) => {
                setPrimaryCalendar(e.target.value);
                setEventType(eventTypesForCalendar(e.target.value)[0] ?? "Other");
              }}
            >
              {PRIMARY_CALENDARS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Event type
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Internal title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} />
          </label>
          <label>
            Campaign display title
            <input
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              maxLength={500}
            />
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={confirmationStatus}
              onChange={(e) => setConfirmationStatus(e.target.value)}
            >
              <option>Hold</option>
              <option>Tentative</option>
              <option>Confirmed</option>
              <option>Cancelled</option>
            </select>
          </label>
        </div>
      </details>

      <details className="panel" open>
        <summary>
          <h2 style={{ display: "inline" }}>2. When?</h2>
        </summary>
        <div className="form-grid">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />{" "}
            All day
          </label>
          {!allDay ? (
            <>
              <label>
                Start
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
              <label>
                End
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </label>
            </>
          ) : null}
        </div>
      </details>

      <details className="panel" open>
        <summary>
          <h2 style={{ display: "inline" }}>3. Where?</h2>
        </summary>
        <div className="form-grid">
          <label>
            Venue
            <input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </label>
          <label>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label>
            County
            <select value={county} onChange={(e) => setCounty(e.target.value)}>
              <option value="">Select county</option>
              {ARKANSAS_COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>
          </label>
          <label>
            Region
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">Select region</option>
              {ARKANSAS_REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Location visibility</legend>
            {["EXACT", "VENUE", "CITY", "COUNTY", "REGION", "HIDDEN"].map((level) => (
              <label key={level} className="check-inline">
                <input
                  type="radio"
                  name="locdisc"
                  checked={locationDisclosure === level}
                  onChange={() => setLocationDisclosure(level)}
                />{" "}
                {level}
              </label>
            ))}
          </fieldset>
        </div>
      </details>

      <details className="panel">
        <summary>
          <h2 style={{ display: "inline" }}>4. Who is involved?</h2>
        </summary>
        <div className="checkbox-grid">
          {STAFF_FLAGS.map((flag) => (
            <label key={flag.key} className="check-inline">
              <input
                type="checkbox"
                checked={Boolean(people[flag.key])}
                onChange={(e) =>
                  setPeople((p) => ({ ...p, [flag.key]: e.target.checked }))
                }
              />{" "}
              {flag.label}
            </label>
          ))}
        </div>
        {gaps.length ? (
          <p className="dev-banner" role="alert" style={{ marginTop: "1rem" }}>
            Staffing gaps: {gaps.join("; ")}
          </p>
        ) : null}
      </details>

      <details className="panel">
        <summary>
          <h2 style={{ display: "inline" }}>5. Plan of action</h2>
        </summary>
        <label>
          Primary objective
          <select value={objective} onChange={(e) => setObjective(e.target.value)}>
            {EVENT_OBJECTIVES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <h3>Program flow</h3>
        <ul className="plain-list">
          {flow.map((item, index) => (
            <li key={item.id}>
              <strong>{item.sequence}.</strong> {item.activity}{" "}
              <button type="button" className="chip-button" onClick={() => moveFlow(index, -1)}>
                Up
              </button>{" "}
              <button type="button" className="chip-button" onClick={() => moveFlow(index, 1)}>
                Down
              </button>
            </li>
          ))}
        </ul>
      </details>

      <details className="panel">
        <summary>
          <h2 style={{ display: "inline" }}>6. Packing checklist</h2>
        </summary>
        <div className="checkbox-grid">
          {packing.map((item, index) => (
            <label key={item.id} className="check-inline">
              <input
                type="checkbox"
                checked={item.state === "NEEDED"}
                onChange={(e) =>
                  setPacking((rows) =>
                    rows.map((r, i) =>
                      i === index
                        ? { ...r, state: e.target.checked ? "NEEDED" : "NOT_NEEDED" }
                        : r,
                    ),
                  )
                }
              />{" "}
              {item.label}
            </label>
          ))}
        </div>
      </details>

      <details className="panel">
        <summary>
          <h2 style={{ display: "inline" }}>7. Pre / day-of / post actions</h2>
        </summary>
        <h3>Pre-event</h3>
        <div className="checkbox-grid compact">
          {preEvent.slice(0, 12).map((item, index) => (
            <label key={item.id} className="check-inline">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setPreEvent((rows) =>
                    rows.map((r, i) =>
                      i === index ? { ...r, checked: e.target.checked } : r,
                    ),
                  )
                }
              />{" "}
              {item.label}
            </label>
          ))}
        </div>
        <h3>Event day</h3>
        <div className="checkbox-grid compact">
          {eventDay.slice(0, 10).map((item, index) => (
            <label key={item.id} className="check-inline">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setEventDay((rows) =>
                    rows.map((r, i) =>
                      i === index ? { ...r, checked: e.target.checked } : r,
                    ),
                  )
                }
              />{" "}
              {item.label}
            </label>
          ))}
        </div>
        <h3>Post-event</h3>
        <div className="checkbox-grid compact">
          {postEvent.slice(0, 10).map((item, index) => (
            <label key={item.id} className="check-inline">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setPostEvent((rows) =>
                    rows.map((r, i) =>
                      i === index ? { ...r, checked: e.target.checked } : r,
                    ),
                  )
                }
              />{" "}
              {item.label}
            </label>
          ))}
        </div>
      </details>

      <details className="panel">
        <summary>
          <h2 style={{ display: "inline" }}>8. Travel & communications</h2>
        </summary>
        <label className="check-inline">
          <input
            type="checkbox"
            checked={travelRequired}
            onChange={(e) => setTravelRequired(e.target.checked)}
          />{" "}
          Candidate travel required
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            checked={overnight}
            onChange={(e) => setOvernight(e.target.checked)}
          />{" "}
          Overnight stay
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            checked={commsNeeded}
            onChange={(e) => setCommsNeeded(e.target.checked)}
          />{" "}
          Social / press promotion needed
        </label>
      </details>

      <AiSuggestionPanel />

      <section className="panel">
        <div className="button-row">
          <button type="button" className="button" disabled={saving || !title.trim()} onClick={() => save("PLANNING")}>
            {saving ? "Saving…" : "Save planning draft"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={saving || !title.trim()}
            onClick={() => save("READY_FOR_REVIEW")}
          >
            Mark ready for review
          </button>
        </div>
        {message ? <p className="muted">{message}</p> : null}
        {draftId ? (
          <p className="muted">
            Draft ID: <code>{draftId}</code>
          </p>
        ) : null}
      </section>
    </div>
  );
}
