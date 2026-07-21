import type { CriteriaDefinition } from "@/lib/missions/v21/communications/audiences/criteria/criteria-types";

const commonOps = ["EQUALS", "NOT_EQUALS", "IN", "NOT_IN"] as const;
const boolOps = ["TRUE", "FALSE", "EQUALS"] as const;
const existsOps = ["EXISTS", "NOT_EXISTS", "TRUE", "FALSE"] as const;
const allTypes = [
  "STATIC",
  "DYNAMIC",
  "MISSION",
  "EVENT",
  "RELATIONSHIP",
  "INTERNAL",
  "TEST_ONLY",
] as const;
const channels = ["EMAIL", "SMS", "MULTI_CHANNEL"] as const;

export const CRITERIA_REGISTRY: readonly CriteriaDefinition[] = [
  {
    key: "mission.id",
    label: "Mission ID",
    description: "People associated with a specific mission",
    dataType: "ID",
    allowedOperators: [...commonOps],
    allowedAudienceTypes: ["MISSION", "DYNAMIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "CampaignMission",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "mission.participation_status",
    label: "Mission participation status",
    description: "Staffing assignment status on a mission",
    dataType: "STRING",
    allowedOperators: [...commonOps],
    allowedAudienceTypes: ["MISSION", "DYNAMIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "MissionStaffingAssignment",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "event.id",
    label: "Event ID",
    description: "People linked to a specific event",
    dataType: "ID",
    allowedOperators: [...commonOps],
    allowedAudienceTypes: ["EVENT", "DYNAMIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "Event",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "volunteer.status",
    label: "Volunteer status",
    description: "Governed volunteer status value",
    dataType: "STRING",
    allowedOperators: [...commonOps],
    allowedAudienceTypes: ["DYNAMIC", "RELATIONSHIP", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "Volunteer",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "volunteer.active",
    label: "Volunteer active",
    description: "Active volunteer flag",
    dataType: "BOOLEAN",
    allowedOperators: [...boolOps],
    allowedAudienceTypes: ["DYNAMIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "Volunteer",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "person.county",
    label: "County",
    description: "Governed county field already stored on the person",
    dataType: "STRING",
    allowedOperators: [...commonOps],
    allowedAudienceTypes: ["DYNAMIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "Person",
    privacyClassification: "PERSONAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
  {
    key: "has_valid_email",
    label: "Has valid email",
    description: "Contact point with valid EMAIL destination exists",
    dataType: "BOOLEAN",
    allowedOperators: [...existsOps],
    allowedAudienceTypes: [...allTypes],
    allowedChannels: ["EMAIL", "MULTI_CHANNEL"],
    sourceEntity: "CampaignContactPoint",
    privacyClassification: "INTERNAL",
    requiresApproval: false,
    maximumResultPolicy: "PREVIEW_TRUNCATE",
  },
  {
    key: "has_valid_mobile_phone",
    label: "Has valid mobile phone",
    description: "SMS-capable verified mobile contact point exists",
    dataType: "BOOLEAN",
    allowedOperators: [...existsOps],
    allowedAudienceTypes: [...allTypes],
    allowedChannels: ["SMS", "MULTI_CHANNEL"],
    sourceEntity: "CampaignContactPoint",
    privacyClassification: "INTERNAL",
    requiresApproval: false,
    maximumResultPolicy: "PREVIEW_TRUNCATE",
  },
  {
    key: "has_email_consent",
    label: "Has email consent (preview)",
    description: "Snapshot hint only — D20/D21 remain definitive",
    dataType: "BOOLEAN",
    allowedOperators: [...boolOps],
    allowedAudienceTypes: [...allTypes],
    allowedChannels: ["EMAIL", "MULTI_CHANNEL"],
    sourceEntity: "CampaignCommunicationConsentEvidence",
    privacyClassification: "INTERNAL",
    requiresApproval: false,
    maximumResultPolicy: "PREVIEW_TRUNCATE",
  },
  {
    key: "has_sms_consent",
    label: "Has SMS consent (preview)",
    description: "Snapshot hint only — D20/D21 remain definitive",
    dataType: "BOOLEAN",
    allowedOperators: [...boolOps],
    allowedAudienceTypes: [...allTypes],
    allowedChannels: ["SMS", "MULTI_CHANNEL"],
    sourceEntity: "CampaignCommunicationConsentEvidence",
    privacyClassification: "INTERNAL",
    requiresApproval: false,
    maximumResultPolicy: "PREVIEW_TRUNCATE",
  },
  {
    key: "not_suppressed",
    label: "Not suppressed (preview)",
    description: "Snapshot hint only — D20/D21 remain definitive",
    dataType: "BOOLEAN",
    allowedOperators: [...boolOps],
    allowedAudienceTypes: [...allTypes],
    allowedChannels: [...channels],
    sourceEntity: "CampaignCommunicationSuppression",
    privacyClassification: "INTERNAL",
    requiresApproval: false,
    maximumResultPolicy: "PREVIEW_TRUNCATE",
  },
  {
    key: "static.member",
    label: "Static audience member",
    description: "Canonical person explicitly added to a static audience",
    dataType: "ID",
    allowedOperators: ["IN", "EQUALS"],
    allowedAudienceTypes: ["STATIC", "TEST_ONLY"],
    allowedChannels: [...channels],
    sourceEntity: "CommunicationAudienceStaticMember",
    privacyClassification: "INTERNAL",
    requiresApproval: true,
    maximumResultPolicy: "MANIFEST_BLOCK",
  },
] as const;

export const PROHIBITED_CRITERIA_KEYS = [
  "inferred.race",
  "inferred.ethnicity",
  "religion",
  "disability",
  "medical",
  "sexual_orientation",
  "family_private",
  "financial_distress",
  "immigration_status",
  "psychological_vulnerability",
  "relationship.private_notes",
  "persuasion_score",
  "opposition_research",
  "scraped_data",
  "social_media_private",
  "organizer_freeform_notes",
  "authentication",
  "sql",
  "prisma_where",
  "raw_email_list",
  "raw_phone_list",
] as const;

const byKey = new Map(CRITERIA_REGISTRY.map((c) => [c.key, c]));

export function getCriteriaDefinition(key: string): CriteriaDefinition | undefined {
  return byKey.get(key);
}

export function listCriteriaRegistry(): readonly CriteriaDefinition[] {
  return CRITERIA_REGISTRY;
}

export function isProhibitedCriteriaKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  if ((PROHIBITED_CRITERIA_KEYS as readonly string[]).includes(k)) return true;
  if (k.includes("sql") || k.includes("prisma") || k.includes("raw_")) return true;
  return getCriteriaDefinition(key)?.privacyClassification === "PROHIBITED";
}
