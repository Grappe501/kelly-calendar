import {
  ACTION_PRIORITIES,
  ACTION_SOURCES,
  CRITERION_ASSESSMENTS,
  DEBRIEF_ITEM_TEXT_MAX,
  DEBRIEF_LIST_MAX,
  DEBRIEF_TEXT_MAX,
  FORBIDDEN_DEBRIEF_KEYS,
  LESSON_CATEGORIES,
  LESSON_IMPORTANCE,
  ORGANIZATION_RESULTS,
  OUTCOME_ASSESSMENTS,
  QUESTION_STATUSES,
  RELATIONSHIP_OUTCOMES,
  type CriterionAssessmentValue,
  type DebriefActionPriority,
  type DebriefActionSource,
  type DebriefPatchInput,
  type DebriefPatchSection,
  type LessonCategory,
  type LessonImportance,
  type MissionCommitmentReview,
  type MissionCriterionAssessment,
  type MissionDebriefAction,
  type MissionFollowUpReview,
  type MissionLesson,
  type MissionLessonItem,
  type MissionOrganizationOutcome,
  type MissionOutcomeAssessment,
  type MissionPersonOutcome,
  type MissionStrategicInsight,
  type MissionUnresolvedQuestion,
  type OrganizationResultValue,
  type RelationshipOutcomeValue,
  type UnresolvedQuestionStatus,
} from "@/lib/missions/v21/debrief/types";

export type DebriefValidationIssue = {
  path: string;
  code: string;
  message: string;
};

const SECTIONS: DebriefPatchSection[] = [
  "start",
  "outcome",
  "criteria",
  "peopleOutcomes",
  "organizationOutcomes",
  "commitmentReviews",
  "followUpReviews",
  "whatWorked",
  "whatDidNotWork",
  "lessons",
  "insights",
  "questions",
  "nextActions",
  "notes",
  "complete",
  "approve",
  "reopen",
  "all",
];

function cleanNullable(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
  max = DEBRIEF_TEXT_MAX,
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
  issues: DebriefValidationIssue[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  issues.push({ path, code: "INVALID_ENUM", message: `Invalid value for ${path}.` });
  return undefined;
}

function requireId(
  raw: Record<string, unknown>,
  path: string,
  fallback: string,
  seen: Set<string>,
  issues: DebriefValidationIssue[],
): string | null {
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : fallback;
  if (seen.has(id)) {
    issues.push({ path: `${path}.id`, code: "DUPLICATE_ID", message: "Duplicate id." });
    return null;
  }
  seen.add(id);
  return id;
}

function asCriteria(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionCriterionAssessment[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionCriterionAssessment[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = requireId(row, `${path}[${i}]`, `crit_${i}`, seen, issues);
    if (!id) continue;
    const criterionText =
      typeof row.criterionText === "string" ? row.criterionText.trim() : "";
    if (!criterionText) continue;
    const assessment =
      enumOrIssue(
        row.assessment ?? "UNKNOWN",
        CRITERION_ASSESSMENTS,
        `${path}[${i}].assessment`,
        issues,
      ) ?? ("UNKNOWN" as CriterionAssessmentValue);
    out.push({
      id,
      criterionText: criterionText.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      assessment,
      evidence: cleanNullable(row.evidence, `${path}[${i}].evidence`, issues, DEBRIEF_ITEM_TEXT_MAX) ?? null,
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues, DEBRIEF_ITEM_TEXT_MAX) ?? null,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

function asPeople(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionPersonOutcome[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionPersonOutcome[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = requireId(row, `${path}[${i}]`, `po_${i}`, seen, issues);
    if (!id) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const relationshipOutcome =
      enumOrIssue(
        row.relationshipOutcome ?? "UNCLEAR",
        RELATIONSHIP_OUTCOMES,
        `${path}[${i}].relationshipOutcome`,
        issues,
      ) ?? ("UNCLEAR" as RelationshipOutcomeValue);
    out.push({
      id,
      name: name.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      roleOrOrg: cleanNullable(row.roleOrOrg, `${path}[${i}].roleOrOrg`, issues, 200) ?? null,
      prepareGoal: cleanNullable(row.prepareGoal, `${path}[${i}].prepareGoal`, issues) ?? null,
      executeState: cleanNullable(row.executeState, `${path}[${i}].executeState`, issues, 80) ?? null,
      executeNote: cleanNullable(row.executeNote, `${path}[${i}].executeNote`, issues) ?? null,
      relationshipOutcome,
      recommendedNextStep:
        cleanNullable(row.recommendedNextStep, `${path}[${i}].recommendedNextStep`, issues) ?? null,
      followUpNeeded: Boolean(row.followUpNeeded),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

function asOrgs(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionOrganizationOutcome[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionOrganizationOutcome[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = requireId(row, `${path}[${i}]`, `oo_${i}`, seen, issues);
    if (!id) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const result =
      enumOrIssue(
        row.result ?? "OUTCOME_UNCLEAR",
        ORGANIZATION_RESULTS,
        `${path}[${i}].result`,
        issues,
      ) ?? ("OUTCOME_UNCLEAR" as OrganizationResultValue);
    out.push({
      id,
      name: name.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      orgType: cleanNullable(row.orgType, `${path}[${i}].orgType`, issues, 120) ?? null,
      prepareDesiredOutcome:
        cleanNullable(row.prepareDesiredOutcome, `${path}[${i}].prepareDesiredOutcome`, issues) ??
        null,
      executeState: cleanNullable(row.executeState, `${path}[${i}].executeState`, issues, 80) ?? null,
      executeNote: cleanNullable(row.executeNote, `${path}[${i}].executeNote`, issues) ?? null,
      result,
      relationshipChange:
        cleanNullable(row.relationshipChange, `${path}[${i}].relationshipChange`, issues) ?? null,
      recommendedNextStep:
        cleanNullable(row.recommendedNextStep, `${path}[${i}].recommendedNextStep`, issues) ?? null,
      followUpNeeded: Boolean(row.followUpNeeded),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

function asCommitmentReviews(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionCommitmentReview[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionCommitmentReview[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = requireId(row, `${path}[${i}]`, `cr_${i}`, seen, issues);
    if (!id) continue;
    const originalText =
      typeof row.originalText === "string" ? row.originalText.trim() : "";
    if (!originalText) continue;
    out.push({
      id,
      executeCommitmentId:
        typeof row.executeCommitmentId === "string"
          ? row.executeCommitmentId
          : id,
      originalText: originalText.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      clarification:
        cleanNullable(row.clarification, `${path}[${i}].clarification`, issues) ?? null,
      owner: cleanNullable(row.owner, `${path}[${i}].owner`, issues, 120) ?? null,
      dueAt: cleanNullable(row.dueAt, `${path}[${i}].dueAt`, issues, 40) ?? null,
      confirmed: Boolean(row.confirmed),
      resolved: Boolean(row.resolved),
      uncertain: Boolean(row.uncertain),
      approvedForFollowUp: Boolean(row.approvedForFollowUp),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

function asFollowUpReviews(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionFollowUpReview[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionFollowUpReview[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = requireId(row, `${path}[${i}]`, `fr_${i}`, seen, issues);
    if (!id) continue;
    const originalText =
      typeof row.originalText === "string" ? row.originalText.trim() : "";
    if (!originalText) continue;
    out.push({
      id,
      executeFollowUpId:
        typeof row.executeFollowUpId === "string" ? row.executeFollowUpId : id,
      originalText: originalText.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      clarification:
        cleanNullable(row.clarification, `${path}[${i}].clarification`, issues) ?? null,
      owner: cleanNullable(row.owner, `${path}[${i}].owner`, issues, 120) ?? null,
      priority: cleanNullable(row.priority, `${path}[${i}].priority`, issues, 40) ?? null,
      dueAt: cleanNullable(row.dueAt, `${path}[${i}].dueAt`, issues, 40) ?? null,
      resolved: Boolean(row.resolved),
      approvedForFollowUp: Boolean(row.approvedForFollowUp),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
    });
  }
  return out;
}

function asLessonItems(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionLessonItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionLessonItem[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const statement = typeof row.statement === "string" ? row.statement.trim() : "";
    if (!statement) continue;
    if (statement.length > DEBRIEF_ITEM_TEXT_MAX) {
      issues.push({
        path: `${path}[${i}].statement`,
        code: "MAX_LENGTH",
        message: `Statement exceeds ${DEBRIEF_ITEM_TEXT_MAX} characters.`,
      });
    }
    const id = requireId(row, `${path}[${i}]`, `li_${i}`, seen, issues);
    if (!id) continue;
    let category: LessonCategory | null = null;
    if (row.category != null && row.category !== "") {
      category =
        enumOrIssue(row.category, LESSON_CATEGORIES, `${path}[${i}].category`, issues) ??
        null;
    }
    const importance =
      enumOrIssue(
        row.importance ?? "NORMAL",
        LESSON_IMPORTANCE,
        `${path}[${i}].importance`,
        issues,
      ) ?? ("NORMAL" as LessonImportance);
    out.push({
      id,
      statement: statement.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      category,
      explanation: cleanNullable(row.explanation, `${path}[${i}].explanation`, issues) ?? null,
      practiceOrChange:
        cleanNullable(row.practiceOrChange, `${path}[${i}].practiceOrChange`, issues) ?? null,
      rootCause: cleanNullable(row.rootCause, `${path}[${i}].rootCause`, issues) ?? null,
      importance,
      createdAt:
        typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asLessons(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionLesson[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionLesson[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const statement = typeof row.statement === "string" ? row.statement.trim() : "";
    if (!statement) continue;
    const id = requireId(row, `${path}[${i}]`, `lesson_${i}`, seen, issues);
    if (!id) continue;
    let category: LessonCategory | null = null;
    if (row.category != null && row.category !== "") {
      category =
        enumOrIssue(row.category, LESSON_CATEGORIES, `${path}[${i}].category`, issues) ??
        null;
    }
    out.push({
      id,
      statement: statement.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      evidence: cleanNullable(row.evidence, `${path}[${i}].evidence`, issues) ?? null,
      recommendedChange:
        cleanNullable(row.recommendedChange, `${path}[${i}].recommendedChange`, issues) ??
        null,
      applicability:
        cleanNullable(row.applicability, `${path}[${i}].applicability`, issues) ?? null,
      category,
      importance:
        enumOrIssue(
          row.importance ?? "NORMAL",
          LESSON_IMPORTANCE,
          `${path}[${i}].importance`,
          issues,
        ) ?? ("NORMAL" as LessonImportance),
      recommendForCampaignKnowledge: Boolean(row.recommendForCampaignKnowledge),
      createdAt:
        typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asInsights(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionStrategicInsight[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionStrategicInsight[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    if (text.length > DEBRIEF_ITEM_TEXT_MAX) {
      issues.push({
        path: `${path}[${i}].text`,
        code: "MAX_LENGTH",
        message: `Insight exceeds ${DEBRIEF_ITEM_TEXT_MAX} characters.`,
      });
    }
    const id = requireId(row, `${path}[${i}]`, `si_${i}`, seen, issues);
    if (!id) continue;
    out.push({
      id,
      text: text.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      createdAt:
        typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asQuestions(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionUnresolvedQuestion[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionUnresolvedQuestion[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const question = typeof row.question === "string" ? row.question.trim() : "";
    if (!question) continue;
    const id = requireId(row, `${path}[${i}]`, `uq_${i}`, seen, issues);
    if (!id) continue;
    out.push({
      id,
      question: question.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      whyItMatters: cleanNullable(row.whyItMatters, `${path}[${i}].whyItMatters`, issues) ?? null,
      owner: cleanNullable(row.owner, `${path}[${i}].owner`, issues, 120) ?? null,
      dueAt: cleanNullable(row.dueAt, `${path}[${i}].dueAt`, issues, 40) ?? null,
      relatedTo: cleanNullable(row.relatedTo, `${path}[${i}].relatedTo`, issues, 200) ?? null,
      status:
        enumOrIssue(
          row.status ?? "OPEN",
          QUESTION_STATUSES,
          `${path}[${i}].status`,
          issues,
        ) ?? ("OPEN" as UnresolvedQuestionStatus),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      createdAt:
        typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

function asActions(
  value: unknown,
  path: string,
  issues: DebriefValidationIssue[],
): MissionDebriefAction[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    issues.push({ path, code: "TYPE", message: `${path} must be an array.` });
    return undefined;
  }
  if (value.length > DEBRIEF_LIST_MAX) {
    issues.push({ path, code: "MAX_ITEMS", message: `${path} too many items.` });
  }
  const out: MissionDebriefAction[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    const id = requireId(row, `${path}[${i}]`, `act_${i}`, seen, issues);
    if (!id) continue;
    const priority =
      enumOrIssue(
        row.priority ?? "NORMAL",
        ACTION_PRIORITIES,
        `${path}[${i}].priority`,
        issues,
      ) ?? ("NORMAL" as DebriefActionPriority);
    const source =
      enumOrIssue(
        row.source ?? "OPERATOR_ADDED",
        ACTION_SOURCES,
        `${path}[${i}].source`,
        issues,
      ) ?? ("OPERATOR_ADDED" as DebriefActionSource);
    out.push({
      id,
      text: text.slice(0, DEBRIEF_ITEM_TEXT_MAX),
      owner: cleanNullable(row.owner, `${path}[${i}].owner`, issues, 120) ?? null,
      priority,
      dueAt: cleanNullable(row.dueAt, `${path}[${i}].dueAt`, issues, 40) ?? null,
      relatedPerson:
        cleanNullable(row.relatedPerson, `${path}[${i}].relatedPerson`, issues, 200) ?? null,
      relatedOrganization:
        cleanNullable(
          row.relatedOrganization,
          `${path}[${i}].relatedOrganization`,
          issues,
          200,
        ) ?? null,
      relatedCommitmentId:
        cleanNullable(
          row.relatedCommitmentId,
          `${path}[${i}].relatedCommitmentId`,
          issues,
          80,
        ) ?? null,
      relatedFollowUpId:
        cleanNullable(row.relatedFollowUpId, `${path}[${i}].relatedFollowUpId`, issues, 80) ??
        null,
      source,
      approvedForFollowUp: Boolean(row.approvedForFollowUp),
      completed: Boolean(row.completed),
      notes: cleanNullable(row.notes, `${path}[${i}].notes`, issues) ?? null,
      createdAt:
        typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      updatedAt:
        typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
      createdByUserId:
        typeof row.createdByUserId === "string" ? row.createdByUserId : null,
    });
  }
  return out;
}

export function validateDebriefPatch(raw: unknown): {
  ok: boolean;
  value?: DebriefPatchInput;
  issues: DebriefValidationIssue[];
} {
  const issues: DebriefValidationIssue[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [{ path: "", code: "TYPE", message: "Body must be an object." }],
    };
  }
  const body = raw as Record<string, unknown>;

  for (const key of FORBIDDEN_DEBRIEF_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      issues.push({
        path: key,
        code: "FORBIDDEN_FIELD",
        message: `${key} cannot be mutated from Debrief Mode.`,
      });
    }
  }

  const section = body.section;
  if (typeof section !== "string" || !(SECTIONS as string[]).includes(section)) {
    issues.push({
      path: "section",
      code: "INVALID_SECTION",
      message: "Unknown or missing debrief section.",
    });
  }

  const outcomeAssessment = enumOrIssue(
    body.outcomeAssessment,
    OUTCOME_ASSESSMENTS,
    "outcomeAssessment",
    issues,
  ) as MissionOutcomeAssessment | undefined;

  const value: DebriefPatchInput = {
    section: (typeof section === "string" ? section : "all") as DebriefPatchSection,
    outcomeAssessment,
    outcomeSummary: cleanNullable(body.outcomeSummary, "outcomeSummary", issues),
    criterionAssessments: asCriteria(body.criterionAssessments, "criterionAssessments", issues),
    peopleOutcomes: asPeople(body.peopleOutcomes, "peopleOutcomes", issues),
    organizationOutcomes: asOrgs(
      body.organizationOutcomes,
      "organizationOutcomes",
      issues,
    ),
    commitmentReviews: asCommitmentReviews(
      body.commitmentReviews,
      "commitmentReviews",
      issues,
    ),
    followUpReviews: asFollowUpReviews(body.followUpReviews, "followUpReviews", issues),
    whatWorked: asLessonItems(body.whatWorked, "whatWorked", issues),
    whatDidNotWork: asLessonItems(body.whatDidNotWork, "whatDidNotWork", issues),
    lessonsLearned: asLessons(body.lessonsLearned, "lessonsLearned", issues),
    strategicInsights: asInsights(body.strategicInsights, "strategicInsights", issues),
    unresolvedQuestions: asQuestions(body.unresolvedQuestions, "unresolvedQuestions", issues),
    recommendedNextSteps: asActions(
      body.recommendedNextSteps,
      "recommendedNextSteps",
      issues,
    ),
    internalNotes: cleanNullable(body.internalNotes, "internalNotes", issues),
  };

  const blocking = issues.filter(
    (i) =>
      i.code === "FORBIDDEN_FIELD" ||
      i.code === "INVALID_SECTION" ||
      i.code === "TYPE" ||
      i.code === "INVALID_ENUM" ||
      i.code === "MAX_LENGTH" ||
      i.code === "MAX_ITEMS" ||
      i.code === "DUPLICATE_ID",
  );

  return { ok: blocking.length === 0, value, issues };
}
