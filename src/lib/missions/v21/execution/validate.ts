import {
  EXECUTION_ITEM_TEXT_MAX,
  EXECUTION_LIST_MAX,
  EXECUTION_TEXT_MAX,
  FOLLOW_UP_PRIORITIES,
  FORBIDDEN_EXECUTION_KEYS,
  OBSERVATION_CATEGORIES,
  ORG_CONTACT_STATES,
  PERSON_CONTACT_STATES,
  type ExecutionPatchInput,
  type ExecutionPatchSection,
  type FollowUpPriority,
  type MissionCommitment,
  type MissionImmediateFollowUp,
  type MissionObservation,
  type MissionOrganizationContact,
  type MissionPersonContact,
  type ObservationCategory,
  type OrgContactState,
  type PersonContactState,
} from "@/lib/missions/v21/execution/types";

export type ExecutionValidationIssue = {
  path: string;
  code: string;
  message: string;
};

const SECTIONS: ExecutionPatchSection[] = [
  "arrive",
  "start",
  "complete",
  "arrivalNote",
  "observations",
  "peopleContacts",
  "organizationContacts",
  "commitments",
  "immediateFollowUps",
  "fieldNotes",
  "all",
];

function cleanNullable(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
  max = EXECUTION_TEXT_MAX,
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

function asObservations(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
): MissionObservation[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > EXECUTION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionObservation[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    if (text.length > EXECUTION_ITEM_TEXT_MAX) {
      issues.push({
        path: `${path}[${i}].text`,
        code: "MAX_LENGTH",
        message: `Observation exceeds ${EXECUTION_ITEM_TEXT_MAX} characters.`,
      });
    }
    const id =
      typeof row.id === "string" && row.id.trim() ? row.id.trim() : `obs_${i}`;
    if (seen.has(id)) {
      issues.push({
        path: `${path}[${i}].id`,
        code: "DUPLICATE_ID",
        message: "Duplicate observation id.",
      });
      continue;
    }
    seen.add(id);
    let category: ObservationCategory | null = null;
    if (row.category != null && row.category !== "") {
      if (
        typeof row.category === "string" &&
        (OBSERVATION_CATEGORIES as readonly string[]).includes(row.category)
      ) {
        category = row.category as ObservationCategory;
      } else {
        issues.push({
          path: `${path}[${i}].category`,
          code: "INVALID_ENUM",
          message: "Invalid observation category.",
        });
      }
    }
    out.push({
      id,
      text: text.slice(0, EXECUTION_ITEM_TEXT_MAX),
      category,
      important: Boolean(row.important),
      createdAt:
        typeof row.createdAt === "string" && !Number.isNaN(Date.parse(row.createdAt))
          ? row.createdAt
          : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asPeopleContacts(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
): MissionPersonContact[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  const out: MissionPersonContact[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const stateRaw = row.state;
    if (
      typeof stateRaw !== "string" ||
      !(PERSON_CONTACT_STATES as readonly string[]).includes(stateRaw)
    ) {
      issues.push({
        path: `${path}[${i}].state`,
        code: "INVALID_ENUM",
        message: "Invalid person contact state.",
      });
      continue;
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `pc_${i}`,
      preparePersonId:
        typeof row.preparePersonId === "string" ? row.preparePersonId : null,
      name: name.slice(0, EXECUTION_ITEM_TEXT_MAX),
      state: stateRaw as PersonContactState,
      note:
        typeof row.note === "string" && row.note.trim()
          ? row.note.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

function asOrgContacts(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
): MissionOrganizationContact[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  const out: MissionOrganizationContact[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const stateRaw = row.state;
    if (
      typeof stateRaw !== "string" ||
      !(ORG_CONTACT_STATES as readonly string[]).includes(stateRaw)
    ) {
      issues.push({
        path: `${path}[${i}].state`,
        code: "INVALID_ENUM",
        message: "Invalid organization contact state.",
      });
      continue;
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `oc_${i}`,
      prepareOrganizationId:
        typeof row.prepareOrganizationId === "string"
          ? row.prepareOrganizationId
          : null,
      name: name.slice(0, EXECUTION_ITEM_TEXT_MAX),
      state: stateRaw as OrgContactState,
      note:
        typeof row.note === "string" && row.note.trim()
          ? row.note.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      updatedAt: new Date().toISOString(),
    });
  }
  return out;
}

function asCommitments(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
): MissionCommitment[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > EXECUTION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const now = new Date().toISOString();
  const out: MissionCommitment[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    let dueAt: string | null = null;
    if (row.dueAt != null && row.dueAt !== "") {
      const d = new Date(String(row.dueAt));
      if (Number.isNaN(d.getTime())) {
        issues.push({
          path: `${path}[${i}].dueAt`,
          code: "INVALID_DATE",
          message: "dueAt must be a valid ISO date.",
        });
      } else {
        dueAt = d.toISOString();
      }
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `cmt_${i}`,
      text: text.slice(0, EXECUTION_ITEM_TEXT_MAX),
      madeTo:
        typeof row.madeTo === "string" && row.madeTo.trim()
          ? row.madeTo.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      owner:
        typeof row.owner === "string" && row.owner.trim()
          ? row.owner.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      dueAt,
      needsFollowUp: Boolean(row.needsFollowUp),
      completed: Boolean(row.completed),
      notes:
        typeof row.notes === "string" && row.notes.trim()
          ? row.notes.trim().slice(0, EXECUTION_TEXT_MAX)
          : null,
      createdAt:
        typeof row.createdAt === "string" && !Number.isNaN(Date.parse(row.createdAt))
          ? row.createdAt
          : now,
      updatedAt: now,
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asFollowUps(
  value: unknown,
  path: string,
  issues: ExecutionValidationIssue[],
): MissionImmediateFollowUp[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > EXECUTION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const now = new Date().toISOString();
  const out: MissionImmediateFollowUp[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    let priority: FollowUpPriority = "NORMAL";
    if (row.priority != null) {
      if (
        typeof row.priority === "string" &&
        (FOLLOW_UP_PRIORITIES as readonly string[]).includes(row.priority)
      ) {
        priority = row.priority as FollowUpPriority;
      } else {
        issues.push({
          path: `${path}[${i}].priority`,
          code: "INVALID_ENUM",
          message: "Invalid follow-up priority.",
        });
        continue;
      }
    }
    let dueAt: string | null = null;
    if (row.dueAt != null && row.dueAt !== "") {
      const d = new Date(String(row.dueAt));
      if (Number.isNaN(d.getTime())) {
        issues.push({
          path: `${path}[${i}].dueAt`,
          code: "INVALID_DATE",
          message: "dueAt must be a valid ISO date.",
        });
      } else {
        dueAt = d.toISOString();
      }
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `fu_${i}`,
      text: text.slice(0, EXECUTION_ITEM_TEXT_MAX),
      relatedTo:
        typeof row.relatedTo === "string" && row.relatedTo.trim()
          ? row.relatedTo.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      owner:
        typeof row.owner === "string" && row.owner.trim()
          ? row.owner.trim().slice(0, EXECUTION_ITEM_TEXT_MAX)
          : null,
      priority,
      dueAt,
      completed: Boolean(row.completed),
      createdAt:
        typeof row.createdAt === "string" && !Number.isNaN(Date.parse(row.createdAt))
          ? row.createdAt
          : now,
      updatedAt: now,
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

export function validateExecutionPatch(raw: unknown): {
  ok: boolean;
  issues: ExecutionValidationIssue[];
  value: ExecutionPatchInput | null;
} {
  const issues: ExecutionValidationIssue[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: "", code: "TYPE", message: "Body must be an object." }],
      value: null,
    };
  }
  const body = raw as Record<string, unknown>;

  for (const key of FORBIDDEN_EXECUTION_KEYS) {
    if (key in body) {
      issues.push({
        path: key,
        code: "FORBIDDEN_FIELD",
        message: `${key} cannot be changed through Execute Mode.`,
      });
    }
  }

  if (typeof body.section !== "string" || !SECTIONS.includes(body.section as ExecutionPatchSection)) {
    issues.push({
      path: "section",
      code: "REQUIRED",
      message: "section is required and must be a known Execute section.",
    });
  }

  const value: ExecutionPatchInput = {
    section: (body.section as ExecutionPatchSection) || "all",
    arrivalNote: cleanNullable(body.arrivalNote, "arrivalNote", issues),
    note: cleanNullable(body.note, "note", issues, EXECUTION_ITEM_TEXT_MAX),
    liveObservations: asObservations(body.liveObservations, "liveObservations", issues),
    peopleContacts: asPeopleContacts(body.peopleContacts, "peopleContacts", issues),
    organizationContacts: asOrgContacts(
      body.organizationContacts,
      "organizationContacts",
      issues,
    ),
    commitments: asCommitments(body.commitments, "commitments", issues),
    immediateFollowUps: asFollowUps(
      body.immediateFollowUps,
      "immediateFollowUps",
      issues,
    ),
    fieldNotes: cleanNullable(body.fieldNotes, "fieldNotes", issues),
  };

  const failCodes = new Set([
    "TYPE",
    "REQUIRED",
    "INVALID_ENUM",
    "FORBIDDEN_FIELD",
    "MAX_LENGTH",
    "MAX_ITEMS",
    "INVALID_DATE",
    "DUPLICATE_ID",
  ]);
  const ok = !issues.some((i) => failCodes.has(i.code));
  return { ok, issues, value: ok ? value : null };
}
