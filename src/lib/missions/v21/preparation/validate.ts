import {
  FORBIDDEN_SCHEDULE_KEYS,
  PREPARATION_ITEM_TEXT_MAX,
  PREPARATION_LIST_MAX,
  PREPARATION_READINESS_STATES,
  PREPARATION_TEXT_MAX,
  type PreparationListItem,
  type PreparationOrganizationBriefing,
  type PreparationPatchInput,
  type PreparationPatchSection,
  type PreparationPersonBriefing,
  type PreparationReadinessState,
  type PreparationTask,
  type MissionPreparationRecord,
} from "@/lib/missions/v21/preparation/types";

export type PreparationValidationIssue = {
  path: string;
  code: string;
  message: string;
};

function cleanNullable(value: unknown, path: string, issues: PreparationValidationIssue[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    issues.push({ path, code: "TYPE", message: `${path} must be a string or null.` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > PREPARATION_TEXT_MAX) {
    issues.push({
      path,
      code: "MAX_LENGTH",
      message: `${path} exceeds ${PREPARATION_TEXT_MAX} characters.`,
    });
  }
  return trimmed.length ? trimmed : null;
}

function asListItems(
  value: unknown,
  path: string,
  issues: PreparationValidationIssue[],
): PreparationListItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > PREPARATION_LIST_MAX) {
    issues.push({
      path,
      code: "MAX_ITEMS",
      message: `${path} exceeds ${PREPARATION_LIST_MAX} items.`,
    });
  }
  const items: PreparationListItem[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") {
      issues.push({ path: `${path}[${i}]`, code: "TYPE", message: "List item must be an object." });
      continue;
    }
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `item_${i}`;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    if (text.length > PREPARATION_ITEM_TEXT_MAX) {
      issues.push({
        path: `${path}[${i}].text`,
        code: "MAX_LENGTH",
        message: `Item text exceeds ${PREPARATION_ITEM_TEXT_MAX} characters.`,
      });
    }
    items.push({ id, text: text.slice(0, PREPARATION_ITEM_TEXT_MAX) });
  }
  return items;
}

function asPeople(
  value: unknown,
  path: string,
  issues: PreparationValidationIssue[],
): PreparationPersonBriefing[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > PREPARATION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: PreparationPersonBriefing[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const str = (k: string) =>
      typeof row[k] === "string" && (row[k] as string).trim()
        ? (row[k] as string).trim().slice(0, PREPARATION_ITEM_TEXT_MAX)
        : null;
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `person_${i}`,
      name: name.slice(0, PREPARATION_ITEM_TEXT_MAX),
      roleOrTitle: str("roleOrTitle"),
      organization: str("organization"),
      relationshipToCampaign: str("relationshipToCampaign"),
      whyTheyMatter: str("whyTheyMatter"),
      lastMeaningfulContact: str("lastMeaningfulContact"),
      conversationGoal: str("conversationGoal"),
      notes: str("notes"),
      sourceNote: str("sourceNote"),
      linkedPersonId: str("linkedPersonId"),
    });
  }
  return out;
}

function asOrgs(
  value: unknown,
  path: string,
  issues: PreparationValidationIssue[],
): PreparationOrganizationBriefing[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > PREPARATION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: PreparationOrganizationBriefing[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const str = (k: string) =>
      typeof row[k] === "string" && (row[k] as string).trim()
        ? (row[k] as string).trim().slice(0, PREPARATION_ITEM_TEXT_MAX)
        : null;
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `org_${i}`,
      name: name.slice(0, PREPARATION_ITEM_TEXT_MAX),
      organizationType: str("organizationType"),
      relationshipToMission: str("relationshipToMission"),
      campaignRelationship: str("campaignRelationship"),
      keyConcern: str("keyConcern"),
      desiredOutcome: str("desiredOutcome"),
      notes: str("notes"),
      sourceNote: str("sourceNote"),
    });
  }
  return out;
}

function asTasks(
  value: unknown,
  path: string,
  issues: PreparationValidationIssue[],
): PreparationTask[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > PREPARATION_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const now = new Date().toISOString();
  const out: PreparationTask[] = [];
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    let dueAt: string | null = null;
    if (row.dueAt != null && row.dueAt !== "") {
      const d = new Date(String(row.dueAt));
      if (Number.isNaN(d.getTime())) {
        issues.push({
          path: `${path}[${i}].dueAt`,
          code: "INVALID_DATE",
          message: "dueAt must be a valid ISO date or empty.",
        });
      } else {
        dueAt = d.toISOString();
      }
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `task_${i}`,
      label: label.slice(0, PREPARATION_ITEM_TEXT_MAX),
      owner:
        typeof row.owner === "string" && row.owner.trim()
          ? row.owner.trim().slice(0, PREPARATION_ITEM_TEXT_MAX)
          : null,
      dueAt,
      completed: Boolean(row.completed),
      notes:
        typeof row.notes === "string" && row.notes.trim()
          ? row.notes.trim().slice(0, PREPARATION_TEXT_MAX)
          : null,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : i,
      createdAt:
        typeof row.createdAt === "string" && !Number.isNaN(Date.parse(row.createdAt))
          ? row.createdAt
          : now,
      updatedAt: now,
    });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

const SECTIONS: PreparationPatchSection[] = [
  "strategy",
  "message",
  "people",
  "organizations",
  "logistics",
  "tasks",
  "notes",
  "readiness",
  "all",
];

/**
 * Validate Prepare Mode PATCH. Rejects Event schedule keys and unknown readiness.
 */
export function validatePreparationPatch(raw: unknown): {
  ok: boolean;
  issues: PreparationValidationIssue[];
  value: PreparationPatchInput | null;
} {
  const issues: PreparationValidationIssue[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: "", code: "TYPE", message: "Body must be an object." }],
      value: null,
    };
  }
  const body = raw as Record<string, unknown>;

  for (const key of FORBIDDEN_SCHEDULE_KEYS) {
    if (key in body) {
      issues.push({
        path: key,
        code: "FORBIDDEN_SCHEDULE_FIELD",
        message: `${key} cannot be changed through Prepare Mode.`,
      });
    }
  }

  const sectionRaw = body.section;
  if (typeof sectionRaw !== "string" || !SECTIONS.includes(sectionRaw as PreparationPatchSection)) {
    issues.push({
      path: "section",
      code: "REQUIRED",
      message: "section is required and must be a known Prepare section.",
    });
  }
  const section = sectionRaw as PreparationPatchSection;

  let readinessState: PreparationReadinessState | undefined;
  if (body.readinessState !== undefined) {
    if (
      typeof body.readinessState !== "string" ||
      !(PREPARATION_READINESS_STATES as readonly string[]).includes(body.readinessState)
    ) {
      issues.push({
        path: "readinessState",
        code: "INVALID_ENUM",
        message: "Invalid readinessState.",
      });
    } else {
      readinessState = body.readinessState as PreparationReadinessState;
    }
  }

  const value: PreparationPatchInput = {
    section: section || "all",
    briefingSummary: cleanNullable(body.briefingSummary, "briefingSummary", issues),
    strategicPurpose: cleanNullable(body.strategicPurpose, "strategicPurpose", issues),
    desiredImpression: cleanNullable(body.desiredImpression, "desiredImpression", issues),
    keyMessage: cleanNullable(body.keyMessage, "keyMessage", issues),
    openingApproach: cleanNullable(body.openingApproach, "openingApproach", issues),
    closingApproach: cleanNullable(body.closingApproach, "closingApproach", issues),
    questionsToAsk: asListItems(body.questionsToAsk, "questionsToAsk", issues),
    talkingPoints: asListItems(body.talkingPoints, "talkingPoints", issues),
    thingsToNotice: asListItems(body.thingsToNotice, "thingsToNotice", issues),
    sensitivities: asListItems(body.sensitivities, "sensitivities", issues),
    commitmentsToAvoid: asListItems(body.commitmentsToAvoid, "commitmentsToAvoid", issues),
    storiesOrExamples: asListItems(body.storiesOrExamples, "storiesOrExamples", issues),
    peopleBriefings: asPeople(body.peopleBriefings, "peopleBriefings", issues),
    organizationBriefings: asOrgs(body.organizationBriefings, "organizationBriefings", issues),
    logisticsNotes: cleanNullable(body.logisticsNotes, "logisticsNotes", issues),
    arrivalInstructions: cleanNullable(body.arrivalInstructions, "arrivalInstructions", issues),
    parkingInstructions: cleanNullable(body.parkingInstructions, "parkingInstructions", issues),
    entryContact: cleanNullable(body.entryContact, "entryContact", issues),
    attireNotes: cleanNullable(body.attireNotes, "attireNotes", issues),
    accessibilityNotes: cleanNullable(body.accessibilityNotes, "accessibilityNotes", issues),
    travelNotes: cleanNullable(body.travelNotes, "travelNotes", issues),
    lodgingNotes: cleanNullable(body.lodgingNotes, "lodgingNotes", issues),
    materialsNeeded: asListItems(body.materialsNeeded, "materialsNeeded", issues),
    preparationTasks: asTasks(body.preparationTasks, "preparationTasks", issues),
    operatorNotes: cleanNullable(body.operatorNotes, "operatorNotes", issues),
    readinessState,
  };

  const ok = !issues.some((i) =>
    ["TYPE", "REQUIRED", "INVALID_ENUM", "FORBIDDEN_SCHEDULE_FIELD", "MAX_LENGTH", "MAX_ITEMS", "INVALID_DATE"].includes(
      i.code,
    ),
  );
  return { ok, issues, value: ok ? value : null };
}

export function canTransitionReadiness(
  from: PreparationReadinessState,
  to: PreparationReadinessState,
): boolean {
  if (from === to) return true;
  // DRAFT ↔ NEEDS_ATTENTION ↔ READY (operator may step back from READY)
  const allowed: Record<PreparationReadinessState, PreparationReadinessState[]> = {
    DRAFT: ["DRAFT", "NEEDS_ATTENTION", "READY"],
    NEEDS_ATTENTION: ["DRAFT", "NEEDS_ATTENTION", "READY"],
    READY: ["DRAFT", "NEEDS_ATTENTION", "READY"],
  };
  return allowed[from].includes(to);
}

export function buildPreparationReadinessChecks(
  prep: Pick<
    MissionPreparationRecord,
    | "strategicPurpose"
    | "keyMessage"
    | "talkingPoints"
    | "arrivalInstructions"
    | "materialsNeeded"
    | "peopleBriefings"
    | "preparationTasks"
    | "readinessState"
  >,
  projected: { hasObjective: boolean; hasSuccessCriteria: boolean },
) {
  const openTasks = prep.preparationTasks.filter((t) => !t.completed).length;
  return [
    { id: "objective", label: "Mission objective exists (projected)", ok: projected.hasObjective },
    {
      id: "successCriteria",
      label: "At least one success criterion (projected)",
      ok: projected.hasSuccessCriteria,
    },
    {
      id: "strategicPurpose",
      label: "Strategic purpose defined",
      ok: Boolean(prep.strategicPurpose),
    },
    { id: "keyMessage", label: "Key message defined", ok: Boolean(prep.keyMessage) },
    {
      id: "talkingPoints",
      label: "Talking points reviewed",
      ok: prep.talkingPoints.length > 0,
    },
    {
      id: "logistics",
      label: "Arrival instructions added",
      ok: Boolean(prep.arrivalInstructions),
    },
    {
      id: "materials",
      label: "Materials reviewed",
      ok: prep.materialsNeeded.length > 0,
    },
    {
      id: "people",
      label: "People context reviewed",
      ok: prep.peopleBriefings.length > 0,
    },
    {
      id: "tasks",
      label: "Preparation tasks resolved",
      ok: prep.preparationTasks.length > 0 && openTasks === 0,
    },
    {
      id: "markedReady",
      label: "Operator marked briefing ready",
      ok: prep.readinessState === "READY",
    },
  ];
}
