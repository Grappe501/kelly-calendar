import { describe, expect, it } from "vitest";
import { chicagoDateKeyToUtcBounds } from "@/lib/calendar/chicago-date";
import {
  DEFAULT_LAYOUT_PREFERENCES,
  layoutCampaignDay,
  layoutCampaignWeek,
  packTimedLanes,
  type GridEventInput,
} from "@/lib/calendar/scheduling";

function timedEvent(overrides: Partial<GridEventInput> & Pick<GridEventInput, "id" | "startsAt" | "endsAt">): GridEventInput {
  return {
    title: overrides.id,
    isAllDay: false,
    href: `/calendar/events/${overrides.id}`,
    ...overrides,
  };
}

function allDayEvent(
  id: string,
  startDateKey: string,
  endDateKeyExclusive: string,
): GridEventInput {
  return {
    id,
    title: id,
    isAllDay: true,
    href: `/calendar/events/${id}`,
    startsAt: chicagoDateKeyToUtcBounds(startDateKey).start,
    endsAt: chicagoDateKeyToUtcBounds(endDateKeyExclusive).start,
  };
}

describe("layoutCampaignDay", () => {
  it("lays out a same-day timed event within the visible-hours grid", () => {
    const result = layoutCampaignDay({
      dateKey: "2026-08-03",
      events: [
        timedEvent({
          id: "same-day",
          startsAt: "2026-08-03T09:00:00-05:00",
          endsAt: "2026-08-03T10:00:00-05:00",
        }),
      ],
    });

    expect(result.timed).toHaveLength(1);
    const item = result.timed[0];
    expect(item.continuity).toBe("within");
    expect(item.outsideVisibleHours).toBe(false);
    expect(item.clippedStart).toBe(false);
    expect(item.clippedEnd).toBe(false);
    // (9 - 6) * 60 / (16 * 60) * 100
    expect(item.topPct).toBeCloseTo(18.75, 5);
    // 60 / (16 * 60) * 100
    expect(item.heightPct).toBeCloseTo(6.25, 5);
    expect(item.lane).toBe(0);
    expect(item.laneCount).toBe(1);
  });

  it("respects all-day exclusive end — does not occupy the exclusive end date", () => {
    const event = allDayEvent("all-day-1", "2026-08-03", "2026-08-05");

    const onFirstDay = layoutCampaignDay({ dateKey: "2026-08-03", events: [event] });
    const onSecondDay = layoutCampaignDay({ dateKey: "2026-08-04", events: [event] });
    const onExclusiveEndDay = layoutCampaignDay({ dateKey: "2026-08-05", events: [event] });

    expect(onFirstDay.allDay.map((a) => a.id)).toEqual(["all-day-1"]);
    expect(onSecondDay.allDay.map((a) => a.id)).toEqual(["all-day-1"]);
    expect(onExclusiveEndDay.allDay).toHaveLength(0);

    expect(onFirstDay.allDay[0].continuity).toBe("all_day");
    expect(onFirstDay.allDay[0].spanStartDateKey).toBe("2026-08-03");
    expect(onFirstDay.allDay[0].spanEndExclusiveDateKey).toBe("2026-08-05");
  });

  it("labels overnight continuations via dayMembershipKind and clips at day boundaries", () => {
    const event = timedEvent({
      id: "overnight-1",
      startsAt: "2026-08-03T20:00:00-05:00",
      endsAt: "2026-08-04T08:00:00-05:00",
    });

    const firstDay = layoutCampaignDay({ dateKey: "2026-08-03", events: [event] });
    const secondDay = layoutCampaignDay({ dateKey: "2026-08-04", events: [event] });

    expect(firstDay.timed).toHaveLength(1);
    expect(firstDay.timed[0].continuity).toBe("starts");
    expect(firstDay.timed[0].clippedEnd).toBe(true);
    expect(firstDay.timed[0].clippedStart).toBe(false);

    expect(secondDay.timed).toHaveLength(1);
    expect(secondDay.timed[0].continuity).toBe("ends");
    expect(secondDay.timed[0].clippedStart).toBe(true);
    expect(secondDay.timed[0].clippedEnd).toBe(false);
    // 8pm-midnight clipped to visible end (22:00): (20-6)*60 .. (22-6)*60
    expect(firstDay.timed[0].topPct).toBeCloseTo(87.5, 5);
    // midnight-8am clipped to visible start (6:00): (6-6)*60 .. (8-6)*60
    expect(secondDay.timed[0].topPct).toBeCloseTo(0, 5);
  });

  it("flags events entirely outside the visible-hours window", () => {
    const result = layoutCampaignDay({
      dateKey: "2026-08-03",
      events: [
        timedEvent({
          id: "early-bird",
          startsAt: "2026-08-03T05:00:00-05:00",
          endsAt: "2026-08-03T05:30:00-05:00",
        }),
      ],
    });

    expect(result.timed).toHaveLength(1);
    expect(result.timed[0].outsideVisibleHours).toBe(true);
    expect(result.timed[0].topPct).toBe(0);
    expect(result.timed[0].heightPct).toBe(0);
    expect(result.outsideHoursIds).toEqual(["early-bird"]);
  });

  it("assigns separate lanes and no overlap for touching (half-open) events", () => {
    const result = layoutCampaignDay({
      dateKey: "2026-08-03",
      events: [
        timedEvent({
          id: "a",
          startsAt: "2026-08-03T09:00:00-05:00",
          endsAt: "2026-08-03T10:00:00-05:00",
        }),
        timedEvent({
          id: "b",
          startsAt: "2026-08-03T10:00:00-05:00",
          endsAt: "2026-08-03T11:00:00-05:00",
        }),
      ],
    });

    const byId = new Map(result.timed.map((t) => [t.id, t]));
    expect(byId.get("a")?.lane).toBe(0);
    expect(byId.get("a")?.laneCount).toBe(1);
    expect(byId.get("b")?.lane).toBe(0);
    expect(byId.get("b")?.laneCount).toBe(1);
  });

  it("assigns two lanes for a simple overlap", () => {
    const result = layoutCampaignDay({
      dateKey: "2026-08-03",
      events: [
        timedEvent({
          id: "a",
          startsAt: "2026-08-03T09:00:00-05:00",
          endsAt: "2026-08-03T10:30:00-05:00",
        }),
        timedEvent({
          id: "b",
          startsAt: "2026-08-03T10:00:00-05:00",
          endsAt: "2026-08-03T11:00:00-05:00",
        }),
      ],
    });

    const byId = new Map(result.timed.map((t) => [t.id, t]));
    expect(byId.get("a")?.laneCount).toBe(2);
    expect(byId.get("b")?.laneCount).toBe(2);
    expect(new Set([byId.get("a")?.lane, byId.get("b")?.lane])).toEqual(new Set([0, 1]));
  });

  it("does not mutate its inputs and is deterministic across calls", () => {
    const events = Object.freeze([
      Object.freeze(
        timedEvent({
          id: "pure-1",
          startsAt: "2026-08-03T09:00:00-05:00",
          endsAt: "2026-08-03T10:00:00-05:00",
        }),
      ),
      Object.freeze(allDayEvent("pure-2", "2026-08-03", "2026-08-04")),
    ]);

    const first = layoutCampaignDay({ dateKey: "2026-08-03", events, preferences: Object.freeze({ ...DEFAULT_LAYOUT_PREFERENCES }) });
    const second = layoutCampaignDay({ dateKey: "2026-08-03", events, preferences: Object.freeze({ ...DEFAULT_LAYOUT_PREFERENCES }) });

    expect(second).toEqual(first);
    expect(events).toHaveLength(2);
  });
});

describe("packTimedLanes", () => {
  it("orders stably by start asc, end asc, id asc and assigns lanes deterministically", () => {
    const base = Date.UTC(2026, 7, 3, 15, 0, 0); // arbitrary shared instant
    const assignments = packTimedLanes([
      { id: "c", startMs: base, endMs: base + 60 * 60 * 1000 },
      { id: "a", startMs: base, endMs: base + 60 * 60 * 1000 },
      { id: "b", startMs: base, endMs: base + 60 * 60 * 1000 },
    ]);

    expect(assignments.get("a")).toEqual({ lane: 0, laneCount: 3 });
    expect(assignments.get("b")).toEqual({ lane: 1, laneCount: 3 });
    expect(assignments.get("c")).toEqual({ lane: 2, laneCount: 3 });
  });

  it("treats touching boundaries as non-overlapping", () => {
    const t0 = Date.UTC(2026, 7, 3, 9, 0, 0);
    const t1 = Date.UTC(2026, 7, 3, 10, 0, 0);
    const t2 = Date.UTC(2026, 7, 3, 11, 0, 0);
    const assignments = packTimedLanes([
      { id: "a", startMs: t0, endMs: t1 },
      { id: "b", startMs: t1, endMs: t2 },
    ]);

    expect(assignments.get("a")).toEqual({ lane: 0, laneCount: 1 });
    expect(assignments.get("b")).toEqual({ lane: 0, laneCount: 1 });
  });
});

describe("layoutCampaignWeek", () => {
  const weekKeys = [
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
    "2026-08-08",
    "2026-08-09",
  ];

  it("computes columnStart/columnSpan for a multi-day all-day span fully inside the week", () => {
    const event = allDayEvent("span-within", "2026-08-03", "2026-08-05");
    const result = layoutCampaignWeek({ weekDateKeys: weekKeys, events: [event] });

    expect(result.weekDateKeys).toEqual(weekKeys);
    expect(result.allDayRows).toHaveLength(1);
    expect(result.allDayRows[0]).toMatchObject({
      columnStart: 0,
      columnSpan: 2,
      continuity: "within",
      spanStartDateKey: "2026-08-03",
      spanEndExclusiveDateKey: "2026-08-05",
    });
  });

  it("marks a span that starts before the rendered week as clipped ('ends')", () => {
    const event = allDayEvent("span-clipped-left", "2026-08-01", "2026-08-05");
    const result = layoutCampaignWeek({ weekDateKeys: weekKeys, events: [event] });

    expect(result.allDayRows).toHaveLength(1);
    expect(result.allDayRows[0]).toMatchObject({
      columnStart: 0,
      columnSpan: 2, // Aug 3, Aug 4 visible within this week
      continuity: "ends",
    });
  });

  it("does not silently drop weekend columns from seven-day mode", () => {
    const result = layoutCampaignWeek({
      weekDateKeys: weekKeys,
      events: [],
      preferences: { workweekOnly: false, showWeekends: false },
    });

    expect(result.weekDateKeys).toEqual(weekKeys);
    expect(result.days.map((d) => d.dateKey)).toEqual(weekKeys);
  });

  it("filters to Mon-Fri only when workweekOnly is true", () => {
    const result = layoutCampaignWeek({
      weekDateKeys: weekKeys,
      events: [],
      preferences: { workweekOnly: true },
    });

    expect(result.weekDateKeys).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("packs timed events per-day independently", () => {
    const events = [
      timedEvent({
        id: "mon-a",
        startsAt: "2026-08-03T09:00:00-05:00",
        endsAt: "2026-08-03T10:00:00-05:00",
      }),
      timedEvent({
        id: "tue-a",
        startsAt: "2026-08-04T09:00:00-05:00",
        endsAt: "2026-08-04T10:00:00-05:00",
      }),
      timedEvent({
        id: "tue-b",
        startsAt: "2026-08-04T09:30:00-05:00",
        endsAt: "2026-08-04T10:30:00-05:00",
      }),
    ];
    const result = layoutCampaignWeek({ weekDateKeys: weekKeys, events });

    const monday = result.days.find((d) => d.dateKey === "2026-08-03");
    const tuesday = result.days.find((d) => d.dateKey === "2026-08-04");
    expect(monday?.timed).toHaveLength(1);
    expect(monday?.timed[0].laneCount).toBe(1);
    expect(tuesday?.timed).toHaveLength(2);
    expect(tuesday?.timed.every((t) => t.laneCount === 2)).toBe(true);
  });
});
