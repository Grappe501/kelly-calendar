export type CriteriaOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN"
  | "NOT_IN"
  | "EXISTS"
  | "NOT_EXISTS"
  | "BEFORE"
  | "AFTER"
  | "ON_OR_BEFORE"
  | "ON_OR_AFTER"
  | "TRUE"
  | "FALSE";

export type CriteriaDataType =
  | "STRING"
  | "STRING_SET"
  | "BOOLEAN"
  | "DATE"
  | "ID";

export type CriteriaDefinition = {
  key: string;
  label: string;
  description: string;
  dataType: CriteriaDataType;
  allowedOperators: CriteriaOperator[];
  allowedAudienceTypes: Array<
    | "STATIC"
    | "DYNAMIC"
    | "MISSION"
    | "EVENT"
    | "RELATIONSHIP"
    | "INTERNAL"
    | "TEST_ONLY"
  >;
  allowedChannels: Array<"EMAIL" | "SMS" | "MULTI_CHANNEL">;
  sourceEntity: string;
  privacyClassification: "PUBLIC" | "INTERNAL" | "PERSONAL" | "PROHIBITED";
  requiresApproval: boolean;
  maximumResultPolicy: "PREVIEW_TRUNCATE" | "MANIFEST_BLOCK" | "HARD_FAIL";
};

export type CriteriaCondition = {
  key: string;
  operator: CriteriaOperator;
  value?: string | string[] | boolean | null;
};

export type AudienceCriteriaDocument = {
  schemaVersion: "d24-1";
  match: "ALL" | "ANY";
  conditions: CriteriaCondition[];
  /** Static membership — localPersonIds only, never raw destinations. */
  staticLocalPersonIds?: string[];
  /** Explicit fabricated sandbox pool for TEST_ONLY audiences. */
  fabricatedPoolKey?: string;
};

export type CriteriaValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  normalized: AudienceCriteriaDocument | null;
};
