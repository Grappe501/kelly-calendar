import {
  EVIDENCE_TYPES,
  FOLLOW_UP_ACTION_PRIORITIES,
  FOLLOW_UP_ACTION_STATUSES,
  FOLLOW_UP_OWNER_TYPES,
  FOLLOW_UP_TEXT_MAX,
  FOLLOW_UP_TITLE_MAX,
  FORBIDDEN_FOLLOW_UP_KEYS,
  type FollowUpEvidenceType,
  type FollowUpPatchInput,
  type FollowUpPatchSection,
  type MissionFollowUpActionStatus,
  type MissionFollowUpOwnerType,
  type MissionFollowUpPriority,
} from "@/lib/missions/v21/follow-up/types";

export type FollowUpValidationIssue = {
  path: string;
  code: string;
  message: string;
};

const SECTIONS: FollowUpPatchSection[] = [
  "start",
  "import",
  "notes",
  "addAction",
  "updateAction",
  "completeAction",
  "cancelAction",
  "readyToClose",
  "close",
  "all",
];

function cleanNullable(
  value: unknown,
  path: string,
  issues: FollowUpValidationIssue[],
  max = FOLLOW_UP_TEXT_MAX,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    issues.push({ path, code: "TYPE", message: `${path} must be a string or null.` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    issues.push({
      path,
      code: "MAX_LENGTH",
      message: `${path} exceeds ${max} characters.`,
    });
  }
  return trimmed.length ? trimmed : null;
}

function enumOrIssue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: FollowUpValidationIssue[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  issues.push({ path, code: "INVALID_ENUM", message: `Invalid value for ${path}.` });
  return undefined;
}

export function validateFollowUpPatch(raw: unknown): {
  ok: boolean;
  value?: FollowUpPatchInput;
  issues: FollowUpValidationIssue[];
} {
  const issues: FollowUpValidationIssue[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: "", code: "TYPE", message: "Body must be an object." }],
    };
  }
  const body = raw as Record<string, unknown>;

  for (const key of FORBIDDEN_FOLLOW_UP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      issues.push({
        path: key,
        code: "FORBIDDEN_FIELD",
        message: `${key} cannot be mutated from Follow-up Mode.`,
      });
    }
  }

  const section = body.section;
  if (typeof section !== "string" || !(SECTIONS as string[]).includes(section)) {
    issues.push({
      path: "section",
      code: "INVALID_SECTION",
      message: "Unknown or missing follow-up section.",
    });
  }

  let action: FollowUpPatchInput["action"] | undefined;
  if (body.action !== undefined) {
    if (!body.action || typeof body.action !== "object" || Array.isArray(body.action)) {
      issues.push({ path: "action", code: "TYPE", message: "action must be an object." });
    } else {
      const row = body.action as Record<string, unknown>;
      // Reject nested forbidden keys
      for (const key of ["sourceType", "sourceRecordId", "importKey", "sourceSnapshot", "createdAt"]) {
        if (
          section === "updateAction" &&
          Object.prototype.hasOwnProperty.call(row, key) &&
          key !== "sourceType"
        ) {
          // source fields are ignored on update; only reject if trying to change via top-level
        }
      }
      const title = cleanNullable(row.title, "action.title", issues, FOLLOW_UP_TITLE_MAX);
      action = {
        id: typeof row.id === "string" ? row.id : undefined,
        title: title === undefined ? undefined : title ?? undefined,
        description: cleanNullable(row.description, "action.description", issues),
        status: enumOrIssue(
          row.status,
          FOLLOW_UP_ACTION_STATUSES,
          "action.status",
          issues,
        ) as MissionFollowUpActionStatus | undefined,
        priority: enumOrIssue(
          row.priority,
          FOLLOW_UP_ACTION_PRIORITIES,
          "action.priority",
          issues,
        ) as MissionFollowUpPriority | undefined,
        ownerType: enumOrIssue(
          row.ownerType,
          FOLLOW_UP_OWNER_TYPES,
          "action.ownerType",
          issues,
        ) as MissionFollowUpOwnerType | undefined,
        ownerName: cleanNullable(row.ownerName, "action.ownerName", issues, 200),
        ownerRole: cleanNullable(row.ownerRole, "action.ownerRole", issues, 120),
        ownerUserId: cleanNullable(row.ownerUserId, "action.ownerUserId", issues, 80),
        relatedPersonName: cleanNullable(
          row.relatedPersonName,
          "action.relatedPersonName",
          issues,
          200,
        ),
        relatedOrganizationName: cleanNullable(
          row.relatedOrganizationName,
          "action.relatedOrganizationName",
          issues,
          200,
        ),
        dueAt: cleanNullable(row.dueAt, "action.dueAt", issues, 40),
        nextCheckAt: cleanNullable(row.nextCheckAt, "action.nextCheckAt", issues, 40),
        waitingReason: cleanNullable(row.waitingReason, "action.waitingReason", issues),
        blockedReason: cleanNullable(row.blockedReason, "action.blockedReason", issues),
        completionSummary: cleanNullable(
          row.completionSummary,
          "action.completionSummary",
          issues,
        ),
        expectedUpdatedAt: cleanNullable(
          row.expectedUpdatedAt,
          "action.expectedUpdatedAt",
          issues,
          40,
        ),
      };

      if (section === "addAction" && !title) {
        issues.push({
          path: "action.title",
          code: "REQUIRED",
          message: "Action title is required.",
        });
      }
    }
  }

  if (section === "addAction" && !action) {
    issues.push({
      path: "action",
      code: "REQUIRED",
      message: "action is required for addAction.",
    });
  }

  if (
    (section === "updateAction" ||
      section === "completeAction" ||
      section === "cancelAction") &&
    !action?.id
  ) {
    issues.push({
      path: "action.id",
      code: "REQUIRED",
      message: "action.id is required.",
    });
  }

  const value: FollowUpPatchInput = {
    section: (typeof section === "string" ? section : "all") as FollowUpPatchSection,
    closeoutSummary: cleanNullable(body.closeoutSummary, "closeoutSummary", issues),
    unresolvedSummary: cleanNullable(
      body.unresolvedSummary,
      "unresolvedSummary",
      issues,
    ),
    internalNotes: cleanNullable(body.internalNotes, "internalNotes", issues),
    action,
    evidenceNote: cleanNullable(body.evidenceNote, "evidenceNote", issues),
    evidenceType: enumOrIssue(
      body.evidenceType,
      EVIDENCE_TYPES,
      "evidenceType",
      issues,
    ) as FollowUpEvidenceType | undefined,
    cancellationReason: cleanNullable(
      body.cancellationReason,
      "cancellationReason",
      issues,
    ),
  };

  const blocking = issues.filter((i) =>
    [
      "FORBIDDEN_FIELD",
      "INVALID_SECTION",
      "TYPE",
      "INVALID_ENUM",
      "MAX_LENGTH",
      "REQUIRED",
    ].includes(i.code),
  );

  return { ok: blocking.length === 0, value, issues };
}
