export type TokenDataType =
  | "STRING"
  | "DATE"
  | "DATETIME"
  | "TIME"
  | "NUMBER"
  | "BOOLEAN"
  | "URL"
  | "EMAIL"
  | "PHONE";

export type TokenPrivacyClass =
  | "PUBLIC"
  | "INTERNAL"
  | "PERSONAL"
  | "SENSITIVE"
  | "PROHIBITED";

export type TokenFallbackPolicy =
  | "BLOCK_IF_REQUIRED"
  | "EMPTY_IF_OPTIONAL"
  | "SAFE_GREETING"
  | "LITERAL_FALLBACK";

export type TokenDefinition = {
  key: string;
  description: string;
  dataType: TokenDataType;
  allowedChannels: Array<"EMAIL" | "SMS">;
  source: "recipient" | "mission" | "event" | "campaign" | "communication" | "override";
  privacyClassification: TokenPrivacyClass;
  requiredPermission: "OPERATOR" | "LEADERSHIP";
  fallbackPolicy: TokenFallbackPolicy;
  formattingRules: string[];
  exampleValue: string;
  literalFallback?: string;
};

export type PersonalizationContext = {
  recipient?: Record<string, string | null | undefined>;
  mission?: Record<string, string | null | undefined>;
  event?: Record<string, string | null | undefined>;
  campaign?: Record<string, string | null | undefined>;
  communication?: Record<string, string | null | undefined>;
  overrides?: Record<string, string | null | undefined>;
};

export type TokenResolutionResult = {
  resolved: Record<string, string>;
  unresolvedRequired: string[];
  unresolvedOptional: string[];
  prohibitedAttempted: string[];
  blocked: boolean;
  blockReason: string | null;
};
