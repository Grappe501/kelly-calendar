import type {
  MissionCommitmentReview,
  MissionCriterionAssessment,
  MissionDebriefRecord,
  MissionFollowUpReview,
  MissionOrganizationOutcome,
  MissionPersonOutcome,
} from "@/lib/missions/v21/debrief/types";
import type {
  MissionCommitment,
  MissionImmediateFollowUp,
  MissionOrganizationContact,
  MissionPersonContact,
} from "@/lib/missions/v21/execution/types";

type PrepPerson = {
  id: string;
  name: string;
  roleOrTitle?: string | null;
  organization?: string | null;
  conversationGoal?: string | null;
};

type PrepOrg = {
  id: string;
  name: string;
  organizationType?: string | null;
  desiredOutcome?: string | null;
};

/**
 * Seed empty Debrief review arrays from projected criteria + Prepare + Execute.
 * Does not invent assessments or mark items met/approved.
 */
export function seedDebriefReviews(
  debrief: MissionDebriefRecord,
  input: {
    successCriteria: string[];
    preparePeople: PrepPerson[];
    prepareOrgs: PrepOrg[];
    peopleContacts: MissionPersonContact[];
    organizationContacts: MissionOrganizationContact[];
    commitments: MissionCommitment[];
    immediateFollowUps: MissionImmediateFollowUp[];
  },
): MissionDebriefRecord {
  const now = new Date().toISOString();
  let criterionAssessments = debrief.criterionAssessments;
  let peopleOutcomes = debrief.peopleOutcomes;
  let organizationOutcomes = debrief.organizationOutcomes;
  let commitmentReviews = debrief.commitmentReviews;
  let followUpReviews = debrief.followUpReviews;

  if (criterionAssessments.length === 0 && input.successCriteria.length > 0) {
    criterionAssessments = input.successCriteria.map(
      (text, i): MissionCriterionAssessment => ({
        id: `crit_${i}`,
        criterionText: text,
        assessment: "UNKNOWN",
        evidence: null,
        notes: null,
        updatedAt: now,
      }),
    );
  }

  if (peopleOutcomes.length === 0) {
    const byName = new Map<string, MissionPersonOutcome>();
    for (const p of input.preparePeople) {
      const contact = input.peopleContacts.find(
        (c) => c.preparePersonId === p.id || c.name === p.name,
      );
      byName.set(p.name, {
        id: `po_${p.id || p.name}`,
        name: p.name,
        roleOrOrg:
          [p.roleOrTitle, p.organization].filter(Boolean).join(" · ") || null,
        prepareGoal: p.conversationGoal ?? null,
        executeState: contact?.state ?? null,
        executeNote: contact?.note ?? null,
        relationshipOutcome: contact ? "UNCLEAR" : "NOT_CONTACTED",
        recommendedNextStep: null,
        followUpNeeded: false,
        notes: null,
        updatedAt: now,
      });
    }
    for (const c of input.peopleContacts) {
      if (byName.has(c.name)) continue;
      byName.set(c.name, {
        id: `po_ex_${c.id}`,
        name: c.name,
        roleOrOrg: null,
        prepareGoal: null,
        executeState: c.state,
        executeNote: c.note,
        relationshipOutcome: "UNCLEAR",
        recommendedNextStep: null,
        followUpNeeded: false,
        notes: null,
        updatedAt: now,
      });
    }
    peopleOutcomes = [...byName.values()];
  }

  if (organizationOutcomes.length === 0) {
    const byName = new Map<string, MissionOrganizationOutcome>();
    for (const o of input.prepareOrgs) {
      const contact = input.organizationContacts.find(
        (c) => c.prepareOrganizationId === o.id || c.name === o.name,
      );
      byName.set(o.name, {
        id: `oo_${o.id || o.name}`,
        name: o.name,
        orgType: o.organizationType ?? null,
        prepareDesiredOutcome: o.desiredOutcome ?? null,
        executeState: contact?.state ?? null,
        executeNote: contact?.note ?? null,
        result: contact ? "OUTCOME_UNCLEAR" : "NOT_ENGAGED",
        relationshipChange: null,
        recommendedNextStep: null,
        followUpNeeded: false,
        notes: null,
        updatedAt: now,
      });
    }
    for (const c of input.organizationContacts) {
      if (byName.has(c.name)) continue;
      byName.set(c.name, {
        id: `oo_ex_${c.id}`,
        name: c.name,
        orgType: null,
        prepareDesiredOutcome: null,
        executeState: c.state,
        executeNote: c.note,
        result: "OUTCOME_UNCLEAR",
        relationshipChange: null,
        recommendedNextStep: null,
        followUpNeeded: false,
        notes: null,
        updatedAt: now,
      });
    }
    organizationOutcomes = [...byName.values()];
  }

  if (commitmentReviews.length === 0 && input.commitments.length > 0) {
    commitmentReviews = input.commitments.map(
      (c): MissionCommitmentReview => ({
        id: `cr_${c.id}`,
        executeCommitmentId: c.id,
        originalText: c.text,
        clarification: null,
        owner: c.owner,
        dueAt: c.dueAt,
        confirmed: false,
        resolved: c.completed,
        uncertain: false,
        approvedForFollowUp: false,
        notes: null,
        updatedAt: now,
      }),
    );
  }

  if (followUpReviews.length === 0 && input.immediateFollowUps.length > 0) {
    followUpReviews = input.immediateFollowUps.map(
      (f): MissionFollowUpReview => ({
        id: `fr_${f.id}`,
        executeFollowUpId: f.id,
        originalText: f.text,
        clarification: null,
        owner: f.owner,
        priority: f.priority,
        dueAt: f.dueAt,
        resolved: f.completed,
        approvedForFollowUp: false,
        notes: null,
        updatedAt: now,
      }),
    );
  }

  return {
    ...debrief,
    criterionAssessments,
    peopleOutcomes,
    organizationOutcomes,
    commitmentReviews,
    followUpReviews,
  };
}
