import { createHash } from "node:crypto";

export const RENDER_ENGINE_VERSION = "d23-1";

export type LinkManifestEntry = {
  href: string;
  anchorText: string;
  scheme: string;
  external: boolean;
  safe: boolean;
  warnings: string[];
};

export type ComplianceManifest = {
  profileKey: string;
  footerApplied: boolean;
  unsubscribeRequired: boolean;
  stopLanguageRequired: boolean;
  helpLanguageRequired: boolean;
  testBannerRequired: boolean;
  dispatchEligible: boolean;
  missingRequirements: string[];
};

export type RenderValidationIssue = {
  code: string;
  severity: "BLOCK" | "WARNING";
  message: string;
};

export type CanonicalRenderInput = {
  channel: "EMAIL" | "SMS";
  subjectTemplate: string | null;
  htmlTemplate: string | null;
  textTemplate: string | null;
  smsTemplate: string | null;
  requiredTokens: string[];
  optionalTokens: string[];
  context: import("@/lib/missions/v21/communications/composition/tokens/token-types").PersonalizationContext;
  complianceProfileKey: string;
  renderPurpose: "PREVIEW" | "TEST" | "APPROVAL" | "DISPATCH";
  recipientFingerprint: string;
};

export type CanonicalRenderResult = {
  ok: boolean;
  blocked: boolean;
  blockReason: string | null;
  subjectRendered: string | null;
  htmlRendered: string | null;
  textRendered: string | null;
  smsRendered: string | null;
  resolvedTokens: Record<string, string>;
  unresolvedTokens: string[];
  linkManifest: LinkManifestEntry[];
  complianceManifest: ComplianceManifest;
  contentHash: string;
  renderEngineVersion: string;
  personalizationFingerprint: string;
  sms: {
    characterCount: number;
    encodingClass: "GSM7" | "UCS2";
    estimatedSegments: number;
  } | null;
  issues: RenderValidationIssue[];
};

export type CanonicalProviderMessage = {
  artifactId: string;
  channel: "EMAIL" | "SMS";
  destination: string;
  subject?: string;
  html?: string;
  text: string;
  metadata: {
    dispatchBatchId: string;
    dispatchAttemptId: string;
    contentHash: string;
    idempotencyKey: string;
  };
};

export function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}
