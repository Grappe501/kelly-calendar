import {
  MISSION_LIFECYCLE_PHASES,
  MISSION_OPERATIONAL_STATUSES,
  MISSION_PROJECTION_VERSION,
} from "@/lib/missions/v21/constants";
import type { CampaignMission } from "@/lib/missions/v21/types";

export type MissionValidationIssue = {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type MissionValidationResult = {
  ok: boolean;
  /** Draft missions with incomplete data are ok:true when structurally valid. */
  issues: MissionValidationIssue[];
};

function isIsoDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Structural validation for V2.1 missions.
 * Incomplete intelligence is allowed (warnings only) — drafts must not fail.
 */
export function validateCampaignMission(
  mission: CampaignMission,
): MissionValidationResult {
  const issues: MissionValidationIssue[] = [];

  if (!mission.sourceEventId?.trim()) {
    issues.push({
      path: "sourceEventId",
      code: "REQUIRED",
      message: "sourceEventId is required.",
      severity: "error",
    });
  }
  if (!mission.sourceEventNumber?.trim()) {
    issues.push({
      path: "sourceEventNumber",
      code: "REQUIRED",
      message: "sourceEventNumber is required.",
      severity: "error",
    });
  }
  if (!mission.attendTitle?.trim()) {
    issues.push({
      path: "attendTitle",
      code: "REQUIRED",
      message: "attendTitle is required.",
      severity: "error",
    });
  }
  if (mission.projectionVersion !== MISSION_PROJECTION_VERSION) {
    issues.push({
      path: "projectionVersion",
      code: "UNSUPPORTED_VERSION",
      message: `Unsupported projectionVersion ${mission.projectionVersion}.`,
      severity: "error",
    });
  }
  if (
    !(MISSION_OPERATIONAL_STATUSES as readonly string[]).includes(
      mission.missionStatus,
    )
  ) {
    issues.push({
      path: "missionStatus",
      code: "INVALID_ENUM",
      message: `Invalid missionStatus: ${mission.missionStatus}`,
      severity: "error",
    });
  }
  if (
    !(MISSION_LIFECYCLE_PHASES as readonly string[]).includes(
      mission.lifecyclePhase,
    )
  ) {
    issues.push({
      path: "lifecyclePhase",
      code: "INVALID_ENUM",
      message: `Invalid lifecyclePhase: ${mission.lifecyclePhase}`,
      severity: "error",
    });
  }
  if (!isIsoDate(mission.startsAt) || !isIsoDate(mission.endsAt)) {
    issues.push({
      path: "startsAt/endsAt",
      code: "INVALID_DATE",
      message: "startsAt and endsAt must be valid ISO timestamps.",
      severity: "error",
    });
  } else if (new Date(mission.endsAt) < new Date(mission.startsAt)) {
    issues.push({
      path: "endsAt",
      code: "RANGE",
      message: "endsAt must be >= startsAt.",
      severity: "error",
    });
  }

  if (!Array.isArray(mission.successCriteria)) {
    issues.push({
      path: "successCriteria",
      code: "TYPE",
      message: "successCriteria must be an array.",
      severity: "error",
    });
  } else {
    for (const [i, c] of mission.successCriteria.entries()) {
      if (!c?.text?.trim()) {
        issues.push({
          path: `successCriteria[${i}].text`,
          code: "EMPTY",
          message: "Success criterion text cannot be empty.",
          severity: "error",
        });
      }
    }
  }

  if (!mission.completeness?.isDraftValid) {
    issues.push({
      path: "completeness.isDraftValid",
      code: "DRAFT_INVALID",
      message: "completeness.isDraftValid must be true for projected missions.",
      severity: "error",
    });
  }

  if (!mission.objective) {
    issues.push({
      path: "objective",
      code: "UNKNOWN",
      message: "Objective is unknown — valid draft mission.",
      severity: "warning",
    });
  }
  if (!mission.successCriteria.length) {
    issues.push({
      path: "successCriteria",
      code: "UNKNOWN",
      message: "Success criteria empty — valid draft mission.",
      severity: "warning",
    });
  }
  if (mission.intelligence.expectedRoi != null) {
    // ROI must never be inventively numeric without source; string notes only.
    const roi = mission.intelligence.expectedRoi.trim();
    if (/^\d+(\.\d+)?$/.test(roi)) {
      issues.push({
        path: "intelligence.expectedRoi",
        code: "FAKE_CERTAINTY",
        message:
          "Numeric expectedRoi without operator source is not allowed (Never Fake).",
        severity: "error",
      });
    }
  }

  const ok = !issues.some((i) => i.severity === "error");
  return { ok, issues };
}
