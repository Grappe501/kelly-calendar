import { describe, expect, it } from "vitest";
import {
  campaignDateKey,
  selectTodaysMission,
  type TodaysMissionCandidate,
} from "@/lib/missions/v21/select-todays-mission";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";
import type { MissionLifecyclePhase } from "@/lib/missions/v21/types";

const TZ = "America/Chicago";

function candidate(
  id: string,
  phase: MissionLifecyclePhase,
  startsAt: string,
  endsAt: string,
): TodaysMissionCandidate {
  return { id, lifecyclePhase: phase, startsAt, endsAt };
}

describe("V2.1 Today’s Mission selection", () => {
  it("EXECUTE outranks all other phases", () => {
    const now = new Date("2026-07-19T18:00:00.000Z"); // afternoon CT
    const result = selectTodaysMission(
      [
        candidate(
          "prep",
          "PREPARE",
          "2026-07-19T20:00:00.000Z",
          "2026-07-19T21:00:00.000Z",
        ),
        candidate(
          "exec",
          "EXECUTE",
          "2026-07-19T17:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
        candidate(
          "travel",
          "TRAVEL",
          "2026-07-19T16:00:00.000Z",
          "2026-07-19T17:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("exec");
    expect(result.selectionReason).toBe("EXECUTING_NOW");
  });

  it("TRAVEL outranks PREPARE", () => {
    const now = new Date("2026-07-19T14:30:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "prep",
          "PREPARE",
          "2026-07-19T20:00:00.000Z",
          "2026-07-19T21:00:00.000Z",
        ),
        candidate(
          "travel",
          "TRAVEL",
          "2026-07-19T15:00:00.000Z",
          "2026-07-19T16:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("travel");
    expect(result.selectionReason).toBe("TRAVEL_WINDOW");
  });

  it("selects DEBRIEF when due after execution", () => {
    const now = new Date("2026-07-19T22:00:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "debrief",
          "DEBRIEF",
          "2026-07-19T17:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
        candidate(
          "prep-later",
          "PREPARE",
          "2026-07-20T17:00:00.000Z",
          "2026-07-20T18:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("debrief");
    expect(result.selectionReason).toBe("DEBRIEF_DUE");
  });

  it("selects FOLLOW_UP when appropriate", () => {
    const now = new Date("2026-07-19T23:00:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "fu",
          "FOLLOW_UP",
          "2026-07-19T15:00:00.000Z",
          "2026-07-19T16:00:00.000Z",
        ),
        candidate(
          "prep",
          "PREPARE",
          "2026-07-19T20:00:00.000Z",
          "2026-07-19T21:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("fu");
    expect(result.selectionReason).toBe("FOLLOW_UP_DUE");
  });

  it("nearest eligible mission wins within the same phase; stable ID tie-break", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "b-later",
          "PREPARE",
          "2026-07-19T20:00:00.000Z",
          "2026-07-19T21:00:00.000Z",
        ),
        candidate(
          "a-sooner",
          "PREPARE",
          "2026-07-19T18:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("a-sooner");

    const tie = selectTodaysMission(
      [
        candidate(
          "m-b",
          "PREPARE",
          "2026-07-19T18:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
        candidate(
          "m-a",
          "PREPARE",
          "2026-07-19T18:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(tie.primaryId).toBe("m-a");
  });

  it("prefers currently underway mission within the same phase", () => {
    const now = new Date("2026-07-19T18:30:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "later",
          "EXECUTE",
          "2026-07-19T20:00:00.000Z",
          "2026-07-19T21:00:00.000Z",
        ),
        candidate(
          "now",
          "EXECUTE",
          "2026-07-19T18:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("now");
  });

  it("returns next upcoming when no mission is active today", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "tomorrow",
          "PREPARE",
          "2026-07-20T17:00:00.000Z",
          "2026-07-20T18:00:00.000Z",
        ),
        candidate(
          "done",
          "COMPLETE",
          "2026-07-18T17:00:00.000Z",
          "2026-07-18T18:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("tomorrow");
    expect(result.selectionReason).toBe("NEXT_UPCOMING");
  });

  it("returns empty state when no mission exists", () => {
    const result = selectTodaysMission([], {
      now: new Date("2026-07-19T12:00:00.000Z"),
      timezone: TZ,
    });
    expect(result.primaryId).toBeNull();
    expect(result.nextId).toBeNull();
    expect(result.selectionReason).toBe("NO_MISSION");
  });

  it("timezone boundaries do not incorrectly shift the campaign day", () => {
    // 2026-07-20 04:30 UTC = still July 19 evening in America/Chicago
    const now = new Date("2026-07-20T04:30:00.000Z");
    expect(campaignDateKey(now, TZ)).toBe("2026-07-19");

    const result = selectTodaysMission(
      [
        candidate(
          "jul19",
          "PREPARE",
          "2026-07-20T00:00:00.000Z", // Jul 19 19:00 CT
          "2026-07-20T01:00:00.000Z",
        ),
        candidate(
          "jul20",
          "PREPARE",
          "2026-07-20T17:00:00.000Z", // Jul 20 midday CT
          "2026-07-20T18:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("jul19");
    expect(result.selectionReason).toBe("PREPARING_TODAY");
  });

  it("operational status does not replace lifecycle phase in CTAs", () => {
    const prepare = primaryActionForPhase("m1", "PREPARE");
    const execute = primaryActionForPhase("m1", "EXECUTE");
    const debrief = primaryActionForPhase("m1", "DEBRIEF");
    const followUp = primaryActionForPhase("m1", "FOLLOW_UP");
    expect(prepare.label).toBe("Open Mission Brief");
    expect(execute.label).toBe("Open Execute Mode");
    expect(debrief.label).toBe("Start Debrief");
    expect(followUp.label).toBe("Review Follow-ups");
    expect(prepare.href).toBe("/system/missions/m1/prepare");
    expect(execute.href).toBe("/system/missions/m1/execute");
    expect(debrief.href).toBe("/system/missions/m1/debrief");
    expect(followUp.href).toBe("/system/missions/m1/follow-up");
  });

  it("sets next mission after primary without listing everything", () => {
    const now = new Date("2026-07-19T12:00:00.000Z");
    const result = selectTodaysMission(
      [
        candidate(
          "first",
          "PREPARE",
          "2026-07-19T18:00:00.000Z",
          "2026-07-19T19:00:00.000Z",
        ),
        candidate(
          "second",
          "PREPARE",
          "2026-07-19T21:00:00.000Z",
          "2026-07-19T22:00:00.000Z",
        ),
        candidate(
          "third",
          "PREPARE",
          "2026-07-20T17:00:00.000Z",
          "2026-07-20T18:00:00.000Z",
        ),
      ],
      { now, timezone: TZ },
    );
    expect(result.primaryId).toBe("first");
    expect(result.nextId).toBe("second");
  });
});
