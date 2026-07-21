import type { TokenDefinition } from "@/lib/missions/v21/communications/composition/tokens/token-types";

const both = ["EMAIL", "SMS"] as const;

/** Canonical registered tokens — no arbitrary object traversal. */
export const TOKEN_REGISTRY: readonly TokenDefinition[] = [
  {
    key: "recipient.first_name",
    description: "Recipient given name",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "recipient",
    privacyClassification: "PERSONAL",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "SAFE_GREETING",
    formattingRules: ["trim"],
    exampleValue: "Alex",
  },
  {
    key: "recipient.full_name",
    description: "Recipient full display name",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "recipient",
    privacyClassification: "PERSONAL",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "EMPTY_IF_OPTIONAL",
    formattingRules: ["trim"],
    exampleValue: "Alex Rivera",
  },
  {
    key: "mission.title",
    description: "Mission title",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "mission",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "BLOCK_IF_REQUIRED",
    formattingRules: ["trim"],
    exampleValue: "County Listening Session",
  },
  {
    key: "mission.date",
    description: "Mission calendar date",
    dataType: "DATE",
    allowedChannels: [...both],
    source: "mission",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "BLOCK_IF_REQUIRED",
    formattingRules: ["date"],
    exampleValue: "July 21, 2026",
  },
  {
    key: "mission.location",
    description: "Mission location label",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "mission",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "EMPTY_IF_OPTIONAL",
    formattingRules: ["trim"],
    exampleValue: "Tulsa Community Center",
  },
  {
    key: "event.start_time",
    description: "Event start time",
    dataType: "TIME",
    allowedChannels: [...both],
    source: "event",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "EMPTY_IF_OPTIONAL",
    formattingRules: ["time"],
    exampleValue: "6:00 PM",
  },
  {
    key: "campaign.candidate_name",
    description: "Candidate display name",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "campaign",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "LITERAL_FALLBACK",
    formattingRules: ["trim"],
    exampleValue: "Kelly Grappe",
    literalFallback: "Kelly Grappe",
  },
  {
    key: "campaign.reply_email",
    description: "Public reply email",
    dataType: "EMAIL",
    allowedChannels: ["EMAIL"],
    source: "campaign",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "LITERAL_FALLBACK",
    formattingRules: ["email"],
    exampleValue: "hello@example.test",
    literalFallback: "hello@example.test",
  },
  {
    key: "communication.call_to_action",
    description: "Approved call to action text",
    dataType: "STRING",
    allowedChannels: [...both],
    source: "communication",
    privacyClassification: "PUBLIC",
    requiredPermission: "OPERATOR",
    fallbackPolicy: "EMPTY_IF_OPTIONAL",
    formattingRules: ["trim"],
    exampleValue: "RSVP today",
  },
] as const;

/** Fields that must never render via tokens. */
export const PROHIBITED_TOKEN_KEYS = [
  "recipient.internal_notes",
  "recipient.relationship_score",
  "recipient.health",
  "recipient.financial",
  "recipient.demographic_inference",
  "recipient.opposition_research",
  "recipient.confidence_score",
  "recipient.database_id",
  "recipient.auth",
  "recipient.consent_evidence",
  "recipient.suppression_reason",
] as const;

const byKey = new Map(TOKEN_REGISTRY.map((t) => [t.key, t]));

export function getTokenDefinition(key: string): TokenDefinition | undefined {
  return byKey.get(key);
}

export function listRegisteredTokens(): readonly TokenDefinition[] {
  return TOKEN_REGISTRY;
}

export function isProhibitedTokenKey(key: string): boolean {
  return (PROHIBITED_TOKEN_KEYS as readonly string[]).includes(key) ||
    getTokenDefinition(key)?.privacyClassification === "PROHIBITED";
}
