import { describe, expect, it } from "vitest";
import {
  buildActivationPreview,
  buildScheduleFingerprint,
  classifyWindow,
  computeDueAt,
  getTemplateByLevel,
  recommendPlaybookLevel,
  weekendBeforeEventStart,
} from "@/lib/missions/activation";

describe("IC-02B activation timing & preview", () => {
  const schedule = {
    eventCreatedAt: new Date("2026-07-01T12:00:00.000Z"),
    missionCreatedAt: new Date("2026-07-02T12:00:00.000Z"),
    activationAppliedAt: new Date("2026-07-10T15:00:00.000Z"),
    eventStartsAt: new Date("2026-07-24T18:00:00.000Z"),
    eventEndsAt: new Date("2026-07-24T20:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  };

  it("NONE creates zero preview tasks", () => {
    const p = buildActivationPreview({
      playbookLevel: "NONE",
      schedule,
      now: schedule.activationAppliedAt,
    });
    expect(p.tasks).toHaveLength(0);
    expect(p.createsZeroRecords).toBe(true);
  });

  it("48-hour save-the-date is from activation, not event creation", () => {
    const due = computeDueAt("ACTIVATION_APPLIED", 48, schedule);
    expect(due.toISOString()).toBe(
      new Date("2026-07-12T15:00:00.000Z").toISOString(),
    );
    const fromCreate = computeDueAt("EVENT_CREATED", 48, schedule);
    expect(due.getTime()).not.toBe(fromCreate.getTime());
  });

  it("one-week reminder is 7 days before event start", () => {
    const due = computeDueAt("EVENT_START", -7 * 24, schedule);
    expect(due.toISOString()).toBe(
      new Date("2026-07-17T18:00:00.000Z").toISOString(),
    );
  });

  it("weekend-before is before event start", () => {
    const w = weekendBeforeEventStart(schedule.eventStartsAt, schedule.timezone);
    expect(w.getTime()).toBeLessThan(schedule.eventStartsAt.getTime());
  });

  it("standard preview includes key departments", () => {
    const p = buildActivationPreview({
      playbookLevel: "STANDARD",
      schedule,
      now: schedule.activationAppliedAt,
    });
    expect(p.tasks.length).toBeGreaterThan(10);
    expect(p.departments).toEqual(
      expect.arrayContaining([
        "EVENTS",
        "COMMUNICATIONS",
        "GRAPHICS",
        "LOGISTICS",
      ]),
    );
    expect(p.externalActionsBlocked).toBe(true);
    const std = p.tasks.find((t) => t.stepKey === "prepare_save_the_date");
    expect(std?.requiresExternalProvider).toBe(true);
  });

  it("missed-window when due already past and event imminent", () => {
    const due = new Date("2026-07-09T12:00:00.000Z");
    const label = classifyWindow(
      due,
      new Date("2026-07-23T12:00:00.000Z"),
      new Date("2026-07-22T12:00:00.000Z"),
    );
    expect(label).toBe("MISSED_WINDOW");
  });

  it("fingerprint stable", () => {
    const a = buildScheduleFingerprint({
      startsAt: schedule.eventStartsAt,
      endsAt: schedule.eventEndsAt,
      timezone: "America/Chicago",
      isAllDay: false,
    });
    const b = buildScheduleFingerprint({
      startsAt: schedule.eventStartsAt,
      endsAt: schedule.eventEndsAt,
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(a).toBe(b);
  });

  it("recommend playbook levels", () => {
    expect(recommendPlaybookLevel({ hasMission: true, expectedAttendance: 10 })).toBe(
      "MINIMAL",
    );
    expect(recommendPlaybookLevel({ hasMission: true, expectedAttendance: 40 })).toBe(
      "STANDARD",
    );
    expect(recommendPlaybookLevel({ hasMission: true, expectedAttendance: 120 })).toBe(
      "MAJOR",
    );
  });

  it("template versions are set", () => {
    expect(getTemplateByLevel("STANDARD").version).toBe("1.0.0");
    expect(getTemplateByLevel("NONE").steps).toHaveLength(0);
  });
});
