import type {
  MissionStaffingAssignmentTargetType,
  MissionStaffingAssignmentStatus,
} from "@/lib/missions/v21/staffing/types";

export type AssignmentCreateInput = {
  targetType: MissionStaffingAssignmentTargetType;
  campaignUserId?: string | null;
  localPersonId?: string | null;
  manualDisplayLabel?: string | null;
  manualContactHint?: string | null;
  confirmedExternalPersonId?: string | null;
  mobilizeObservationId?: string | null;
  externalMatchStatus?: string | null;
};

export function validateAssignmentTarget(input: AssignmentCreateInput): {
  ok: boolean;
  message?: string;
} {
  switch (input.targetType) {
    case "CAMPAIGN_USER":
      if (!input.campaignUserId?.trim()) {
        return { ok: false, message: "campaignUserId required." };
      }
      return { ok: true };
    case "LOCAL_PERSON":
      if (!input.localPersonId?.trim()) {
        return { ok: false, message: "localPersonId required." };
      }
      return { ok: true };
    case "MANUAL_SCOPED":
      if (!input.manualDisplayLabel?.trim()) {
        return { ok: false, message: "manualDisplayLabel required for scoped identity." };
      }
      return { ok: true };
    case "CONFIRMED_EXTERNAL_REF":
      if (!input.confirmedExternalPersonId?.trim()) {
        return { ok: false, message: "confirmedExternalPersonId required." };
      }
      if (input.externalMatchStatus === "DO_NOT_LINK") {
        return { ok: false, message: "DO_NOT_LINK identities cannot be assigned." };
      }
      if (input.externalMatchStatus === "AMBIGUOUS") {
        return { ok: false, message: "Ambiguous Mobilize identities cannot be assigned." };
      }
      if (input.externalMatchStatus !== "CONFIRMED") {
        return {
          ok: false,
          message:
            "Unreviewed Mobilize person matches cannot be assigned. Confirm match first (when consent authority exists).",
        };
      }
      return { ok: true };
    default:
      return { ok: false, message: "Unknown target type." };
  }
}

export function validateRequirementCounts(input: {
  requiredCount: number;
  minimumCount: number;
}): { ok: boolean; message?: string } {
  if (!Number.isInteger(input.requiredCount) || input.requiredCount < 0) {
    return { ok: false, message: "requiredCount must be a non-negative integer." };
  }
  if (!Number.isInteger(input.minimumCount) || input.minimumCount < 0) {
    return { ok: false, message: "minimumCount must be a non-negative integer." };
  }
  if (input.minimumCount > input.requiredCount) {
    return { ok: false, message: "minimumCount cannot exceed requiredCount." };
  }
  return { ok: true };
}

export function assertStatusTransition(
  from: MissionStaffingAssignmentStatus,
  to: MissionStaffingAssignmentStatus,
): { ok: boolean; message?: string } {
  if (from === to) return { ok: true };
  const allowed: Record<MissionStaffingAssignmentStatus, MissionStaffingAssignmentStatus[]> = {
    PROPOSED: ["ASSIGNED", "DECLINED", "CANCELLED"],
    ASSIGNED: ["CONFIRMED", "DECLINED", "CANCELLED", "PROPOSED"],
    CONFIRMED: ["CHECKED_IN", "CANCELLED", "RELEASED", "NO_SHOW", "ASSIGNED"],
    CHECKED_IN: ["RELEASED", "NO_SHOW", "CANCELLED"],
    DECLINED: ["PROPOSED", "ASSIGNED"],
    CANCELLED: ["PROPOSED", "ASSIGNED"],
    RELEASED: ["ASSIGNED"],
    NO_SHOW: ["ASSIGNED", "PROPOSED"],
  };
  if (!allowed[from]?.includes(to)) {
    return { ok: false, message: `Cannot transition ${from} → ${to}.` };
  }
  return { ok: true };
}

/** Normalize role key — never invent from Mobilize. */
export function normalizeRoleKey(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}
