import { describe, expect, it } from "vitest";
import {
  assertDispatchArtifactEligible,
  extractLinks,
  getTokenDefinition,
  isProhibitedTokenKey,
  listRegisteredTokens,
  renderCanonicalMessage,
  resolveTokens,
  safeGreeting,
  sanitizeCompositionHtml,
  hashContent,
} from "@/lib/missions/v21/communications/composition";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

const CONTEXT = {
  recipient: { first_name: "Alex", full_name: "Alex Rivera" },
  mission: {
    title: "Listening Session",
    date: "July 21, 2026",
    location: "Tulsa",
  },
  event: { start_time: "6:00 PM" },
  campaign: {
    candidate_name: "Kelly Grappe",
    reply_email: "hello@example.test",
  },
  communication: { call_to_action: "RSVP" },
};

describe("D23 communications template composition", () => {
  it("registers tokens and blocks prohibited keys", () => {
    expect(listRegisteredTokens().length).toBeGreaterThan(5);
    expect(getTokenDefinition("recipient.first_name")).toBeTruthy();
    expect(isProhibitedTokenKey("recipient.internal_notes")).toBe(true);
    expect(isProhibitedTokenKey("recipient.relationship_score")).toBe(true);
  });

  it("uses safe greeting without inventing friend language", () => {
    expect(safeGreeting(null)).toBe("Hello,");
    expect(safeGreeting("Alex")).toBe("Hello Alex,");
    expect(safeGreeting("")).toBe("Hello,");
  });

  it("blocks required unresolved tokens and prohibited attempts", () => {
    const blocked = resolveTokens({
      templates: ["Hi {{recipient.first_name}} — {{mission.title}}"],
      requiredKeys: ["mission.title"],
      optionalKeys: ["recipient.first_name"],
      context: { recipient: {}, mission: {} },
      channel: "EMAIL",
    });
    expect(blocked.blocked).toBe(true);
    expect(blocked.blockReason).toContain("RENDER BLOCKED");

    const prohibited = resolveTokens({
      templates: ["{{recipient.internal_notes}}"],
      requiredKeys: [],
      optionalKeys: ["recipient.internal_notes"],
      context: { recipient: { internal_notes: "secret" } },
      channel: "EMAIL",
    });
    expect(prohibited.prohibitedAttempted).toContain("recipient.internal_notes");
    expect(prohibited.blocked).toBe(true);
  });

  it("renders deterministic email with sanitization and compliance", () => {
    const a = renderCanonicalMessage({
      channel: "EMAIL",
      subjectTemplate: "Reminder: {{mission.title}}",
      htmlTemplate:
        "<p>Hello {{recipient.first_name}}</p><script>alert(1)</script><a href=\"https://example.test/rsvp\">RSVP</a>",
      textTemplate: "Hello {{recipient.first_name}}\nhttps://example.test/rsvp",
      smsTemplate: null,
      requiredTokens: ["mission.title"],
      optionalTokens: ["recipient.first_name"],
      context: CONTEXT,
      complianceProfileKey: "EMAIL_SANDBOX_TEST",
      renderPurpose: "PREVIEW",
      recipientFingerprint: "fp-preview",
    });
    expect(a.ok).toBe(true);
    expect(a.subjectRendered).toContain("Listening Session");
    expect(a.htmlRendered).not.toContain("<script");
    expect(a.textRendered).toContain("SANDBOX TEST");
    expect(a.contentHash).toHaveLength(64);

    const b = renderCanonicalMessage({
      channel: "EMAIL",
      subjectTemplate: "Reminder: {{mission.title}}",
      htmlTemplate:
        "<p>Hello {{recipient.first_name}}</p><a href=\"https://example.test/rsvp\">RSVP</a>",
      textTemplate: "Hello {{recipient.first_name}}\nhttps://example.test/rsvp",
      smsTemplate: null,
      requiredTokens: ["mission.title"],
      optionalTokens: ["recipient.first_name"],
      context: CONTEXT,
      complianceProfileKey: "EMAIL_SANDBOX_TEST",
      renderPurpose: "PREVIEW",
      recipientFingerprint: "fp-preview",
    });
    expect(b.contentHash).toBe(a.contentHash);
  });

  it("rejects unsafe links and surfaces SMS segments", () => {
    const links = extractLinks('href="javascript:alert(1)" https://example.test/x');
    expect(links.some((l) => !l.safe)).toBe(true);

    const sms = renderCanonicalMessage({
      channel: "SMS",
      subjectTemplate: null,
      htmlTemplate: null,
      textTemplate: null,
      smsTemplate:
        "Hi {{recipient.first_name}} — {{mission.title}} at {{event.start_time}}. {{communication.call_to_action}}",
      requiredTokens: ["mission.title"],
      optionalTokens: ["recipient.first_name", "event.start_time", "communication.call_to_action"],
      context: CONTEXT,
      complianceProfileKey: "SMS_SANDBOX_TEST",
      renderPurpose: "PREVIEW",
      recipientFingerprint: "fp-sms",
    });
    expect(sms.ok).toBe(true);
    expect(sms.sms?.estimatedSegments).toBeGreaterThan(0);
    expect(sms.smsRendered).toContain("STOP");
  });

  it("keeps dispatch artifacts ineligible for production and blocks drafts", () => {
    expect(d22ProductionDispatchHardBlock().blocked).toBe(true);
    const eligible = assertDispatchArtifactEligible({
      renderPurpose: "PREVIEW",
      invalidatedAt: null,
      validationOk: true,
      compositionApproved: true,
      channel: "EMAIL",
      expectedChannel: "EMAIL",
      recipientFingerprint: "a",
      expectedRecipientFingerprint: "a",
      contentHash: "h",
      expectedContentHash: "h",
    });
    expect(eligible.ok).toBe(false);
    expect(eligible.reasons).toContain("PURPOSE_NOT_DISPATCH");
    expect(eligible.reasons).toContain("PRODUCTION_DISPATCH_BLOCKED");

    const draft = assertDispatchArtifactEligible({
      renderPurpose: "DISPATCH",
      invalidatedAt: null,
      validationOk: true,
      compositionApproved: false,
      channel: "EMAIL",
      expectedChannel: "EMAIL",
      recipientFingerprint: "a",
      expectedRecipientFingerprint: "a",
      contentHash: "h",
      expectedContentHash: "h",
    });
    expect(draft.reasons).toContain("COMPOSITION_NOT_APPROVED");
  });

  it("sanitizes executable HTML attributes", () => {
    const cleaned = sanitizeCompositionHtml(
      '<p onclick="evil()">ok</p><img src=x onerror=alert(1)>',
    );
    expect(cleaned).not.toMatch(/onclick/i);
    expect(cleaned).not.toMatch(/onerror/i);
  });

  it("hashes content deterministically", () => {
    expect(hashContent(["a", "b"])).toBe(hashContent(["a", "b"]));
    expect(hashContent(["a", "b"])).not.toBe(hashContent(["a", "c"]));
  });
});
