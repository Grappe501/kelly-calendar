import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";

export type PrivacyClassification =
  | "PUBLIC_GEOGRAPHY"
  | "CAMPAIGN_STRATEGIC"
  | "VOLUNTEER_AGGREGATE"
  | "PERSONAL_CONTACT"
  | "SENSITIVE_PERSONAL"
  | "UNKNOWN";

const DENIED_FIELD_PATTERNS = [
  /^email/i,
  /^phone/i,
  /^street/i,
  /^address$/i,
  /home_?address/i,
  /^person$/i,
  /given_?name/i,
  /family_?name/i,
  /full_?name/i,
  /^notes$/i,
  /consent/i,
  /communication_?prefer/i,
  /ssn|dob|birth/i,
  /demographic/i,
];

const ALLOWED_STRATEGIC_FIELDS = new Set([
  "externalObjectId",
  "objectType",
  "countyFips",
  "placeGeoid",
  "countyName",
  "placeName",
  "factKind",
  "factValue",
  "factUnits",
  "updatedAt",
  "focusArea",
  "region",
  "priorityTier",
  "coverageTarget",
  "volunteerCapacityAggregate",
]);

export function classifyField(fieldName: string): PrivacyClassification {
  if (DENIED_FIELD_PATTERNS.some((re) => re.test(fieldName))) {
    if (/email|phone|street|address|name/i.test(fieldName)) {
      return "PERSONAL_CONTACT";
    }
    return "SENSITIVE_PERSONAL";
  }
  if (
    /fips|geoid|county|place|region|focus|priority|coverage|tier/i.test(
      fieldName,
    )
  ) {
    return /priority|focus|tier|coverage|capacity/i.test(fieldName)
      ? "CAMPAIGN_STRATEGIC"
      : "PUBLIC_GEOGRAPHY";
  }
  if (/volunteer.*aggregat|capacity_aggregate/i.test(fieldName)) {
    return "VOLUNTEER_AGGREGATE";
  }
  return "UNKNOWN";
}

export function isFieldAllowed(fieldName: string): boolean {
  if (DENIED_FIELD_PATTERNS.some((re) => re.test(fieldName))) return false;
  if (ALLOWED_STRATEGIC_FIELDS.has(fieldName)) return true;
  const cls = classifyField(fieldName);
  return (
    cls === "PUBLIC_GEOGRAPHY" ||
    cls === "CAMPAIGN_STRATEGIC" ||
    cls === "VOLUNTEER_AGGREGATE"
  );
}

export type PrivacyFilterResult = {
  allowed: Record<string, unknown>;
  excludedFieldCount: number;
  excludedFields: string[];
  privacyClassification: PrivacyClassification;
  privacyAllowlistVersion: string;
};

/** Deny-by-default: strip denied/unknown fields; count exclusions without retaining values. */
export function filterAllowedFields(
  input: Record<string, unknown>,
): PrivacyFilterResult {
  const allowed: Record<string, unknown> = {};
  const excludedFields: string[] = [];
  let deniedWorst: PrivacyClassification | null = null;
  let allowedKind: PrivacyClassification = "PUBLIC_GEOGRAPHY";

  const rankDenied = (cls: PrivacyClassification) => {
    if (cls === "SENSITIVE_PERSONAL") return 3;
    if (cls === "PERSONAL_CONTACT") return 2;
    if (cls === "UNKNOWN") return 1;
    return 0;
  };

  for (const [key, value] of Object.entries(input)) {
    const cls = classifyField(key);
    if (!isFieldAllowed(key)) {
      excludedFields.push(key);
      if (
        cls === "PERSONAL_CONTACT" ||
        cls === "SENSITIVE_PERSONAL" ||
        cls === "UNKNOWN"
      ) {
        if (!deniedWorst || rankDenied(cls) > rankDenied(deniedWorst)) {
          deniedWorst = cls;
        }
      }
      continue;
    }
    allowed[key] = value;
    if (cls === "CAMPAIGN_STRATEGIC") allowedKind = "CAMPAIGN_STRATEGIC";
    else if (
      cls === "VOLUNTEER_AGGREGATE" &&
      allowedKind === "PUBLIC_GEOGRAPHY"
    ) {
      allowedKind = "VOLUNTEER_AGGREGATE";
    }
  }

  const privacyClassification: PrivacyClassification =
    Object.keys(allowed).length > 0
      ? Object.keys(allowed).some((k) =>
          /priority|focus|tier|coverage|fact/i.test(k),
        )
        ? "CAMPAIGN_STRATEGIC"
        : allowedKind
      : (deniedWorst ?? "UNKNOWN");

  return {
    allowed,
    excludedFieldCount: excludedFields.length,
    excludedFields,
    privacyClassification,
    privacyAllowlistVersion: REDDIRT_DOCS.privacyAllowlistVersion,
  };
}

export function assertPersonLevelDenied(input: Record<string, unknown>): boolean {
  return Object.keys(input).some(
    (k) =>
      classifyField(k) === "PERSONAL_CONTACT" ||
      classifyField(k) === "SENSITIVE_PERSONAL" ||
      /^person$/i.test(k),
  );
}
