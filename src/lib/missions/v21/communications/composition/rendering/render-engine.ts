import {
  applyResolvedTokens,
  resolveTokens,
  safeGreeting,
} from "@/lib/missions/v21/communications/composition/tokens/token-resolver";
import {
  assertNoUnresolvedTokens,
  htmlToPlainText,
  sanitizeCompositionHtml,
} from "@/lib/missions/v21/communications/composition/rendering/render-sanitizer";
import { extractLinks } from "@/lib/missions/v21/communications/composition/links/link-inspector";
import {
  applyComplianceFooter,
  getComplianceProfile,
} from "@/lib/missions/v21/communications/composition/compliance/profiles";
import {
  hashContent,
  normalizeWhitespace,
  RENDER_ENGINE_VERSION,
  type CanonicalRenderInput,
  type CanonicalRenderResult,
  type RenderValidationIssue,
} from "@/lib/missions/v21/communications/composition/rendering/render-types";
import { estimateSmsSegments } from "@/lib/missions/v21/communications/content";

function gsm7Compatible(text: string): boolean {
  // Simplified: non-ASCII ⇒ UCS2
  return /^[\x00-\x7F]*$/.test(text);
}

/**
 * Provider-neutral renderer. Never calls providers or reads credentials.
 */
export function renderCanonicalMessage(
  input: CanonicalRenderInput,
): CanonicalRenderResult {
  const issues: RenderValidationIssue[] = [];
  const profile = getComplianceProfile(input.complianceProfileKey);
  if (!profile) {
    return blockedResult(input, `Unknown compliance profile: ${input.complianceProfileKey}`);
  }
  if (profile.allowedChannel !== input.channel) {
    return blockedResult(input, "Compliance profile channel mismatch");
  }

  const templates = [
    input.subjectTemplate,
    input.htmlTemplate,
    input.textTemplate,
    input.smsTemplate,
  ].filter((t): t is string => Boolean(t));

  const ctx = { ...input.context };
  if (ctx.recipient && !ctx.recipient.first_name) {
    // Do not invent names; greeting uses safe fallback via token policy.
  }

  const resolution = resolveTokens({
    templates,
    requiredKeys: input.requiredTokens,
    optionalKeys: input.optionalTokens,
    context: ctx,
    channel: input.channel,
  });

  if (resolution.blocked) {
    return {
      ...emptyRender(input),
      ok: false,
      blocked: true,
      blockReason: resolution.blockReason,
      resolvedTokens: resolution.resolved,
      unresolvedTokens: [
        ...resolution.unresolvedRequired,
        ...resolution.prohibitedAttempted,
      ],
      issues: [
        {
          code: "RENDER_BLOCKED",
          severity: "BLOCK",
          message: resolution.blockReason ?? "RENDER BLOCKED",
        },
      ],
    };
  }

  // Inject safe greeting companion when first_name empty
  if (
    resolution.resolved["recipient.first_name"] === "" &&
    !ctx.overrides?.["greeting"]
  ) {
    resolution.resolved["greeting"] = safeGreeting(null);
  }

  let subjectRendered: string | null = null;
  let htmlRendered: string | null = null;
  let textRendered: string | null = null;
  let smsRendered: string | null = null;

  if (input.channel === "EMAIL") {
    subjectRendered = normalizeWhitespace(
      applyResolvedTokens(input.subjectTemplate ?? "", resolution.resolved),
    );
    const rawHtml = applyResolvedTokens(
      input.htmlTemplate ?? input.textTemplate ?? "",
      resolution.resolved,
    );
    htmlRendered = sanitizeCompositionHtml(rawHtml);
    textRendered = normalizeWhitespace(
      applyResolvedTokens(
        input.textTemplate ?? htmlToPlainText(htmlRendered),
        resolution.resolved,
      ),
    );
    const textFooter = applyComplianceFooter(textRendered, profile);
    textRendered = textFooter.body;
    if (htmlRendered) {
      const htmlFooter = applyComplianceFooter(htmlRendered, profile);
      htmlRendered = `<div>${htmlFooter.body.replace(/\n/g, "<br/>")}</div>`;
    }
    if (!subjectRendered) {
      issues.push({
        code: "SUBJECT_MISSING",
        severity: "BLOCK",
        message: "Email subject required",
      });
    }
    if (subjectRendered && subjectRendered.length > 200) {
      issues.push({
        code: "SUBJECT_TOO_LONG",
        severity: "WARNING",
        message: "Subject exceeds 200 characters",
      });
    }
    if (!textRendered) {
      issues.push({
        code: "TEXT_MISSING",
        severity: "BLOCK",
        message: "Plain-text alternative required",
      });
    }
    for (const tok of assertNoUnresolvedTokens(
      `${subjectRendered}\n${htmlRendered}\n${textRendered}`,
    )) {
      issues.push({
        code: "UNRESOLVED_TOKEN",
        severity: "BLOCK",
        message: `Unresolved token {{${tok}}}`,
      });
    }
    const compliance = textFooter.manifest;
    const links = extractLinks(`${htmlRendered}\n${textRendered}`);
    for (const link of links) {
      if (!link.safe) {
        issues.push({
          code: "UNSAFE_LINK",
          severity: "BLOCK",
          message: `Unsafe link: ${link.href}`,
        });
      }
      for (const w of link.warnings) {
        if (w === "DEVELOPMENT_LINK" || w === "MISSING_HTTPS") {
          issues.push({
            code: w,
            severity: "WARNING",
            message: `${w} on ${link.href}`,
          });
        }
      }
    }
    for (const m of compliance.missingRequirements) {
      issues.push({
        code: m,
        severity: "BLOCK",
        message: `Compliance missing: ${m}`,
      });
    }
    const blocked = issues.some((i) => i.severity === "BLOCK");
    const contentHash = hashContent([
      subjectRendered ?? "",
      htmlRendered ?? "",
      textRendered ?? "",
      input.recipientFingerprint,
    ]);
    const personalizationFingerprint = hashContent([
      JSON.stringify(resolution.resolved),
      input.recipientFingerprint,
    ]);
    return {
      ok: !blocked,
      blocked,
      blockReason: blocked
        ? issues.find((i) => i.severity === "BLOCK")?.message ?? "BLOCKED"
        : null,
      subjectRendered,
      htmlRendered,
      textRendered,
      smsRendered: null,
      resolvedTokens: resolution.resolved,
      unresolvedTokens: resolution.unresolvedOptional,
      linkManifest: links,
      complianceManifest: compliance,
      contentHash,
      renderEngineVersion: RENDER_ENGINE_VERSION,
      personalizationFingerprint,
      sms: null,
      issues,
    };
  }

  // SMS
  let body = normalizeWhitespace(
    applyResolvedTokens(input.smsTemplate ?? input.textTemplate ?? "", resolution.resolved),
  );
  const withFooter = applyComplianceFooter(body, profile);
  body = withFooter.body;
  smsRendered = body;
  for (const tok of assertNoUnresolvedTokens(body)) {
    issues.push({
      code: "UNRESOLVED_TOKEN",
      severity: "BLOCK",
      message: `Unresolved token {{${tok}}}`,
    });
  }
  if (/<[^>]+>/.test(body)) {
    issues.push({
      code: "HTML_IN_SMS",
      severity: "BLOCK",
      message: "SMS must not contain HTML",
    });
  }
  const estimate = estimateSmsSegments(body);
  if (estimate.segments > 4) {
    issues.push({
      code: "SMS_TOO_LONG",
      severity: "WARNING",
      message: `Estimated ${estimate.segments} segments — review before dispatch`,
    });
  }
  if (estimate.segments > 8) {
    issues.push({
      code: "SMS_EXCEEDS_POLICY",
      severity: "BLOCK",
      message: "SMS exceeds policy segment limit (8)",
    });
  }
  const links = extractLinks(body);
  for (const link of links) {
    if (!link.safe) {
      issues.push({
        code: "UNSAFE_LINK",
        severity: "BLOCK",
        message: `Unsafe link: ${link.href}`,
      });
    }
  }
  for (const m of withFooter.manifest.missingRequirements) {
    issues.push({
      code: m,
      severity: "BLOCK",
      message: `Compliance missing: ${m}`,
    });
  }
  const blocked = issues.some((i) => i.severity === "BLOCK");
  const contentHash = hashContent([body, input.recipientFingerprint]);
  return {
    ok: !blocked,
    blocked,
    blockReason: blocked
      ? issues.find((i) => i.severity === "BLOCK")?.message ?? "BLOCKED"
      : null,
    subjectRendered: null,
    htmlRendered: null,
    textRendered: null,
    smsRendered,
    resolvedTokens: resolution.resolved,
    unresolvedTokens: resolution.unresolvedOptional,
    linkManifest: links,
    complianceManifest: withFooter.manifest,
    contentHash,
    renderEngineVersion: RENDER_ENGINE_VERSION,
    personalizationFingerprint: hashContent([
      JSON.stringify(resolution.resolved),
      input.recipientFingerprint,
    ]),
    sms: {
      characterCount: estimate.length,
      encodingClass: gsm7Compatible(body) ? "GSM7" : "UCS2",
      estimatedSegments: estimate.segments,
    },
    issues,
  };
}

function emptyRender(input: CanonicalRenderInput): Omit<
  CanonicalRenderResult,
  "ok" | "blocked" | "blockReason" | "resolvedTokens" | "unresolvedTokens" | "issues"
> {
  return {
    subjectRendered: null,
    htmlRendered: null,
    textRendered: null,
    smsRendered: null,
    linkManifest: [],
    complianceManifest: {
      profileKey: input.complianceProfileKey,
      footerApplied: false,
      unsubscribeRequired: false,
      stopLanguageRequired: false,
      helpLanguageRequired: false,
      testBannerRequired: false,
      dispatchEligible: false,
      missingRequirements: [],
    },
    contentHash: hashContent(["blocked", input.recipientFingerprint]),
    renderEngineVersion: RENDER_ENGINE_VERSION,
    personalizationFingerprint: hashContent([input.recipientFingerprint]),
    sms: null,
  };
}

function blockedResult(
  input: CanonicalRenderInput,
  reason: string,
): CanonicalRenderResult {
  return {
    ...emptyRender(input),
    ok: false,
    blocked: true,
    blockReason: reason,
    resolvedTokens: {},
    unresolvedTokens: [],
    issues: [{ code: "RENDER_BLOCKED", severity: "BLOCK", message: reason }],
  };
}

export function assertDispatchArtifactEligible(input: {
  renderPurpose: string;
  invalidatedAt: Date | null;
  validationOk: boolean;
  compositionApproved: boolean;
  channel: string;
  expectedChannel: string;
  recipientFingerprint: string;
  expectedRecipientFingerprint: string;
  contentHash: string;
  expectedContentHash: string;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.renderPurpose !== "DISPATCH") reasons.push("PURPOSE_NOT_DISPATCH");
  if (input.invalidatedAt) reasons.push("ARTIFACT_INVALIDATED");
  if (!input.validationOk) reasons.push("VALIDATION_FAILED");
  if (!input.compositionApproved) reasons.push("COMPOSITION_NOT_APPROVED");
  if (input.channel !== input.expectedChannel) reasons.push("CHANNEL_MISMATCH");
  if (input.recipientFingerprint !== input.expectedRecipientFingerprint) {
    reasons.push("RECIPIENT_FINGERPRINT_MISMATCH");
  }
  if (input.contentHash !== input.expectedContentHash) {
    reasons.push("CONTENT_HASH_MISMATCH");
  }
  // Production remains blocked at D21/D22 regardless.
  reasons.push("PRODUCTION_DISPATCH_BLOCKED");
  return { ok: false, reasons };
}
