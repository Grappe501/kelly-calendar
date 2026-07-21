export type * from "@/lib/missions/v21/communications/audiences/criteria/criteria-types";
export {
  CRITERIA_REGISTRY,
  PROHIBITED_CRITERIA_KEYS,
  getCriteriaDefinition,
  listCriteriaRegistry,
  isProhibitedCriteriaKey,
} from "@/lib/missions/v21/communications/audiences/criteria/criteria-registry";
export {
  AUDIENCE_PREVIEW_LIMIT,
  AUDIENCE_REVIEW_LIMIT,
  AUDIENCE_MANIFEST_LIMIT,
  AUDIENCE_ABSOLUTE_HARD_LIMIT,
  validateAudienceCriteria,
  criteriaContentHash,
  explainCriteria,
  evaluationLimitForType,
} from "@/lib/missions/v21/communications/audiences/criteria/criteria-validator";
export {
  destinationFingerprint,
  normalizeEmailDestination,
  normalizePhoneDestination,
  resolveContactDestination,
  detectDeduplicationConflicts,
  personalizationIntegrityFingerprint,
} from "@/lib/missions/v21/communications/audiences/resolution/recipient-resolver";
export {
  explainRecipientReason,
  listRecipientReasons,
} from "@/lib/missions/v21/communications/audiences/reasons/recipient-reason-registry";
export {
  FABRICATED_AUDIENCE_POOLS,
  getFabricatedPool,
} from "@/lib/missions/v21/communications/audiences/previews/fabricated-audience-profiles";
export {
  evaluateAudienceCandidates,
  buildManifestHash,
  assertManifestAttachable,
} from "@/lib/missions/v21/communications/audiences/evaluation/evaluation-engine";
