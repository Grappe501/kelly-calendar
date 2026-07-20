import type {
  MissionPreparationRecord,
  PreparationPatchInput,
  PreparationPatchSection,
} from "@/lib/missions/v21/preparation/types";

/**
 * Merge a validated section patch into an existing preparation record.
 * Untouched sections are preserved exactly.
 */
export function mergePreparationPatch(
  current: MissionPreparationRecord,
  patch: PreparationPatchInput,
  actorUserId: string | null,
  now = new Date(),
): MissionPreparationRecord {
  const section: PreparationPatchSection = patch.section;
  const next: MissionPreparationRecord = { ...current, updatedAt: now.toISOString() };
  if (actorUserId) next.updatedByUserId = actorUserId;

  const touchStrategy = section === "strategy" || section === "all";
  const touchMessage = section === "message" || section === "all";
  const touchPeople = section === "people" || section === "all";
  const touchOrgs = section === "organizations" || section === "all";
  const touchLogistics = section === "logistics" || section === "all";
  const touchTasks = section === "tasks" || section === "all";
  const touchNotes = section === "notes" || section === "all";
  const touchReadiness = section === "readiness" || section === "all";

  if (touchStrategy) {
    if (patch.briefingSummary !== undefined) next.briefingSummary = patch.briefingSummary;
    if (patch.strategicPurpose !== undefined) next.strategicPurpose = patch.strategicPurpose;
    if (patch.desiredImpression !== undefined) next.desiredImpression = patch.desiredImpression;
  }
  if (touchMessage) {
    if (patch.keyMessage !== undefined) next.keyMessage = patch.keyMessage;
    if (patch.openingApproach !== undefined) next.openingApproach = patch.openingApproach;
    if (patch.closingApproach !== undefined) next.closingApproach = patch.closingApproach;
    if (patch.questionsToAsk !== undefined) next.questionsToAsk = patch.questionsToAsk;
    if (patch.talkingPoints !== undefined) next.talkingPoints = patch.talkingPoints;
    if (patch.thingsToNotice !== undefined) next.thingsToNotice = patch.thingsToNotice;
    if (patch.sensitivities !== undefined) next.sensitivities = patch.sensitivities;
    if (patch.commitmentsToAvoid !== undefined) {
      next.commitmentsToAvoid = patch.commitmentsToAvoid;
    }
    if (patch.storiesOrExamples !== undefined) next.storiesOrExamples = patch.storiesOrExamples;
  }
  if (touchPeople && patch.peopleBriefings !== undefined) {
    next.peopleBriefings = patch.peopleBriefings;
  }
  if (touchOrgs && patch.organizationBriefings !== undefined) {
    next.organizationBriefings = patch.organizationBriefings;
  }
  if (touchLogistics) {
    if (patch.logisticsNotes !== undefined) next.logisticsNotes = patch.logisticsNotes;
    if (patch.arrivalInstructions !== undefined) {
      next.arrivalInstructions = patch.arrivalInstructions;
    }
    if (patch.parkingInstructions !== undefined) {
      next.parkingInstructions = patch.parkingInstructions;
    }
    if (patch.entryContact !== undefined) next.entryContact = patch.entryContact;
    if (patch.attireNotes !== undefined) next.attireNotes = patch.attireNotes;
    if (patch.accessibilityNotes !== undefined) {
      next.accessibilityNotes = patch.accessibilityNotes;
    }
    if (patch.travelNotes !== undefined) next.travelNotes = patch.travelNotes;
    if (patch.lodgingNotes !== undefined) next.lodgingNotes = patch.lodgingNotes;
    if (patch.materialsNeeded !== undefined) next.materialsNeeded = patch.materialsNeeded;
  }
  if (touchTasks && patch.preparationTasks !== undefined) {
    next.preparationTasks = patch.preparationTasks;
  }
  if (touchNotes && patch.operatorNotes !== undefined) {
    next.operatorNotes = patch.operatorNotes;
  }
  if (touchReadiness && patch.readinessState !== undefined) {
    next.readinessState = patch.readinessState;
    if (patch.readinessState === "READY") {
      next.markedReadyAt = now.toISOString();
      next.markedReadyByUserId = actorUserId;
    } else if (current.readinessState === "READY") {
      // Stepping back from READY clears mark metadata
      next.markedReadyAt = null;
      next.markedReadyByUserId = null;
    }
  }

  return next;
}
