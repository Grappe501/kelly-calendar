export type RecipientReasonCode =
  | "MATCHED_APPROVED_CRITERIA"
  | "MISSION_PARTICIPANT"
  | "EVENT_ATTENDEE"
  | "ACTIVE_VOLUNTEER"
  | "STATIC_AUDIENCE_MEMBER"
  | "VALID_CHANNEL_DESTINATION"
  | "CONSENT_VALID"
  | "NOT_SUPPRESSED"
  | "CRITERIA_NOT_MATCHED"
  | "MISSING_EMAIL"
  | "MISSING_PHONE"
  | "INVALID_EMAIL"
  | "INVALID_PHONE"
  | "PHONE_CAPABILITY_UNKNOWN"
  | "CONSENT_MISSING"
  | "CONSENT_REVOKED"
  | "GLOBAL_SUPPRESSION"
  | "CHANNEL_SUPPRESSION"
  | "PROVIDER_SUPPRESSION"
  | "DUPLICATE_PERSON"
  | "DUPLICATE_DESTINATION"
  | "PERSON_INACTIVE"
  | "RELATIONSHIP_INACTIVE"
  | "MISSION_ASSOCIATION_MISSING"
  | "EVENT_ASSOCIATION_MISSING"
  | "DESTINATION_UNVERIFIED"
  | "EVALUATION_LIMIT_EXCEEDED"
  | "PROHIBITED_CRITERION"
  | "FABRICATED_PREVIEW_MEMBER";

const LABELS: Record<RecipientReasonCode, string> = {
  MATCHED_APPROVED_CRITERIA: "Matched approved audience criteria",
  MISSION_PARTICIPANT: "Mission participant",
  EVENT_ATTENDEE: "Event attendee",
  ACTIVE_VOLUNTEER: "Active volunteer",
  STATIC_AUDIENCE_MEMBER: "Static audience member",
  VALID_CHANNEL_DESTINATION: "Valid channel destination",
  CONSENT_VALID: "Channel consent currently valid (snapshot)",
  NOT_SUPPRESSED: "Not suppressed (snapshot)",
  CRITERIA_NOT_MATCHED: "Did not match audience criteria",
  MISSING_EMAIL: "No valid email destination",
  MISSING_PHONE: "No valid phone destination",
  INVALID_EMAIL: "Invalid email destination",
  INVALID_PHONE: "Invalid phone destination",
  PHONE_CAPABILITY_UNKNOWN: "Phone capability unknown — SMS blocked",
  CONSENT_MISSING: "Channel consent missing",
  CONSENT_REVOKED: "Channel consent revoked",
  GLOBAL_SUPPRESSION: "Globally suppressed",
  CHANNEL_SUPPRESSION: "Channel suppressed",
  PROVIDER_SUPPRESSION: "Provider suppressed",
  DUPLICATE_PERSON: "Duplicate person in evaluation",
  DUPLICATE_DESTINATION: "Duplicate destination across people",
  PERSON_INACTIVE: "Person inactive",
  RELATIONSHIP_INACTIVE: "Relationship inactive",
  MISSION_ASSOCIATION_MISSING: "Mission association missing",
  EVENT_ASSOCIATION_MISSING: "Event association missing",
  DESTINATION_UNVERIFIED: "Destination unverified",
  EVALUATION_LIMIT_EXCEEDED: "Evaluation limit exceeded",
  PROHIBITED_CRITERION: "Prohibited criterion",
  FABRICATED_PREVIEW_MEMBER: "Fabricated preview persona (not a real recipient)",
};

export function explainRecipientReason(code: string): string {
  return LABELS[code as RecipientReasonCode] ?? code;
}

export function listRecipientReasons(): Array<{ code: string; label: string }> {
  return Object.entries(LABELS).map(([code, label]) => ({ code, label }));
}
