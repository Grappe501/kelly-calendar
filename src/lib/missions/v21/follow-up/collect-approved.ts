import type { MissionDebriefRecord } from "@/lib/missions/v21/debrief/types";
import {
  buildImportKey,
  type MissionFollowUpActionRecord,
  type MissionFollowUpSourceType,
} from "@/lib/missions/v21/follow-up/types";

export type ApprovedImportCandidate = {
  sourceType: MissionFollowUpSourceType;
  sourceRecordId: string;
  importKey: string;
  title: string;
  description: string | null;
  priority: MissionFollowUpActionRecord["priority"];
  ownerName: string | null;
  dueAt: string | null;
  relatedPersonName: string | null;
  relatedOrganizationName: string | null;
  sourceSnapshot: Record<string, unknown>;
};

/**
 * Collect only human-approved Debrief items for Follow-up import.
 * Never invents actions from observations, notes, or unapproved fields.
 */
export function collectApprovedFollowUpCandidates(
  missionId: string,
  debrief: MissionDebriefRecord,
): ApprovedImportCandidate[] {
  const out: ApprovedImportCandidate[] = [];

  for (const c of debrief.commitmentReviews) {
    if (!c.approvedForFollowUp) continue;
    out.push({
      sourceType: "EXECUTE_COMMITMENT",
      sourceRecordId: c.id,
      importKey: buildImportKey(missionId, "EXECUTE_COMMITMENT", c.id),
      title: c.clarification?.trim() || c.originalText,
      description: c.clarification
        ? `Original: ${c.originalText}`
        : null,
      priority: "IMPORTANT",
      ownerName: c.owner,
      dueAt: c.dueAt,
      relatedPersonName: null,
      relatedOrganizationName: null,
      sourceSnapshot: { ...c },
    });
  }

  for (const f of debrief.followUpReviews) {
    if (!f.approvedForFollowUp) continue;
    const priority =
      f.priority === "URGENT" || f.priority === "IMPORTANT"
        ? f.priority
        : "NORMAL";
    out.push({
      sourceType: "EXECUTE_IMMEDIATE_FOLLOW_UP",
      sourceRecordId: f.id,
      importKey: buildImportKey(missionId, "EXECUTE_IMMEDIATE_FOLLOW_UP", f.id),
      title: f.clarification?.trim() || f.originalText,
      description: f.clarification
        ? `Original: ${f.originalText}`
        : null,
      priority,
      ownerName: f.owner,
      dueAt: f.dueAt,
      relatedPersonName: null,
      relatedOrganizationName: null,
      sourceSnapshot: { ...f },
    });
  }

  for (const p of debrief.peopleOutcomes) {
    if (!p.followUpNeeded || !p.recommendedNextStep?.trim()) continue;
    out.push({
      sourceType: "PERSON_RELATIONSHIP_NEXT_STEP",
      sourceRecordId: p.id,
      importKey: buildImportKey(missionId, "PERSON_RELATIONSHIP_NEXT_STEP", p.id),
      title: p.recommendedNextStep.trim(),
      description: `Person: ${p.name}`,
      priority: "NORMAL",
      ownerName: null,
      dueAt: null,
      relatedPersonName: p.name,
      relatedOrganizationName: null,
      sourceSnapshot: { ...p },
    });
  }

  for (const o of debrief.organizationOutcomes) {
    if (!o.followUpNeeded || !o.recommendedNextStep?.trim()) continue;
    out.push({
      sourceType: "ORGANIZATION_RELATIONSHIP_NEXT_STEP",
      sourceRecordId: o.id,
      importKey: buildImportKey(
        missionId,
        "ORGANIZATION_RELATIONSHIP_NEXT_STEP",
        o.id,
      ),
      title: o.recommendedNextStep.trim(),
      description: `Organization: ${o.name}`,
      priority: "NORMAL",
      ownerName: null,
      dueAt: null,
      relatedPersonName: null,
      relatedOrganizationName: o.name,
      sourceSnapshot: { ...o },
    });
  }

  for (const q of debrief.unresolvedQuestions) {
    if (!q.approvedForFollowUp) continue;
    out.push({
      sourceType: "UNRESOLVED_QUESTION",
      sourceRecordId: q.id,
      importKey: buildImportKey(missionId, "UNRESOLVED_QUESTION", q.id),
      title: q.question,
      description: q.whyItMatters,
      priority: "NORMAL",
      ownerName: q.owner,
      dueAt: q.dueAt,
      relatedPersonName: null,
      relatedOrganizationName: null,
      sourceSnapshot: { ...q },
    });
  }

  for (const l of debrief.lessonsLearned) {
    if (!l.approvedForFollowUp) continue;
    out.push({
      sourceType: "LESSON_ACTION",
      sourceRecordId: l.id,
      importKey: buildImportKey(missionId, "LESSON_ACTION", l.id),
      title: l.recommendedChange?.trim() || l.statement,
      description: l.statement,
      priority: l.importance === "CRITICAL" ? "URGENT" : "IMPORTANT",
      ownerName: null,
      dueAt: null,
      relatedPersonName: null,
      relatedOrganizationName: null,
      sourceSnapshot: { ...l },
    });
  }

  for (const a of debrief.recommendedNextSteps) {
    if (!a.approvedForFollowUp) continue;
    out.push({
      sourceType: "DEBRIEF_RECOMMENDED_ACTION",
      sourceRecordId: a.id,
      importKey: buildImportKey(missionId, "DEBRIEF_RECOMMENDED_ACTION", a.id),
      title: a.text,
      description: a.notes,
      priority: a.priority,
      ownerName: a.owner,
      dueAt: a.dueAt,
      relatedPersonName: a.relatedPerson,
      relatedOrganizationName: a.relatedOrganization,
      sourceSnapshot: { ...a },
    });
  }

  return out;
}
