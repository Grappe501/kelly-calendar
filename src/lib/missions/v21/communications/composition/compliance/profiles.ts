import type { ComplianceManifest } from "@/lib/missions/v21/communications/composition/rendering/render-types";

export type ComplianceProfile = {
  key: string;
  allowedChannel: "EMAIL" | "SMS";
  requiredFooterFields: string[];
  unsubscribeRequired: boolean;
  senderIdentificationRequired: boolean;
  physicalAddressRequired: boolean;
  stopLanguageRequired: boolean;
  helpLanguageRequired: boolean;
  testBannerRequired: boolean;
  dispatchEligible: boolean;
  footerText: string;
  policyRefs: string[];
};

export const COMPLIANCE_PROFILES: Record<string, ComplianceProfile> = {
  EMAIL_CAMPAIGN_STANDARD: {
    key: "EMAIL_CAMPAIGN_STANDARD",
    allowedChannel: "EMAIL",
    requiredFooterFields: ["sender", "physical_address", "unsubscribe"],
    unsubscribeRequired: true,
    senderIdentificationRequired: true,
    physicalAddressRequired: true,
    stopLanguageRequired: false,
    helpLanguageRequired: false,
    testBannerRequired: false,
    dispatchEligible: false, // production still blocked at D21/D22
    footerText:
      "\n\n—\nKelly Grappe for Secretary of State\nPaid for by Friends of Kelly Grappe\nTo unsubscribe, reply STOP or use the link provided.",
    policyRefs: ["D20", "CAN-SPAM"],
  },
  EMAIL_INTERNAL: {
    key: "EMAIL_INTERNAL",
    allowedChannel: "EMAIL",
    requiredFooterFields: ["sender"],
    unsubscribeRequired: false,
    senderIdentificationRequired: true,
    physicalAddressRequired: false,
    stopLanguageRequired: false,
    helpLanguageRequired: false,
    testBannerRequired: false,
    dispatchEligible: false,
    footerText: "\n\n—\nInternal campaign notification",
    policyRefs: ["D20"],
  },
  EMAIL_SANDBOX_TEST: {
    key: "EMAIL_SANDBOX_TEST",
    allowedChannel: "EMAIL",
    requiredFooterFields: ["test_banner", "sender"],
    unsubscribeRequired: false,
    senderIdentificationRequired: true,
    physicalAddressRequired: false,
    stopLanguageRequired: false,
    helpLanguageRequired: false,
    testBannerRequired: true,
    dispatchEligible: false,
    footerText:
      "\n\n—\n[SANDBOX TEST — NOT A PRODUCTION MESSAGE]\nKelly Grappe campaign sandbox",
    policyRefs: ["D22", "D23"],
  },
  SMS_CAMPAIGN_STANDARD: {
    key: "SMS_CAMPAIGN_STANDARD",
    allowedChannel: "SMS",
    requiredFooterFields: ["stop", "help"],
    unsubscribeRequired: true,
    senderIdentificationRequired: true,
    physicalAddressRequired: false,
    stopLanguageRequired: true,
    helpLanguageRequired: true,
    testBannerRequired: false,
    dispatchEligible: false,
    footerText: "\nReply STOP to opt out, HELP for help.",
    policyRefs: ["D20", "TCPA"],
  },
  SMS_INTERNAL_TEST: {
    key: "SMS_INTERNAL_TEST",
    allowedChannel: "SMS",
    requiredFooterFields: ["test_banner"],
    unsubscribeRequired: false,
    senderIdentificationRequired: false,
    physicalAddressRequired: false,
    stopLanguageRequired: false,
    helpLanguageRequired: false,
    testBannerRequired: true,
    dispatchEligible: false,
    footerText: "\n[INTERNAL TEST]",
    policyRefs: ["D23"],
  },
  SMS_SANDBOX_TEST: {
    key: "SMS_SANDBOX_TEST",
    allowedChannel: "SMS",
    requiredFooterFields: ["test_banner", "stop"],
    unsubscribeRequired: true,
    senderIdentificationRequired: true,
    physicalAddressRequired: false,
    stopLanguageRequired: true,
    helpLanguageRequired: false,
    testBannerRequired: true,
    dispatchEligible: false,
    footerText: "\n[SANDBOX TEST] Reply STOP to opt out.",
    policyRefs: ["D22", "D23"],
  },
};

export function getComplianceProfile(key: string): ComplianceProfile | null {
  return COMPLIANCE_PROFILES[key] ?? null;
}

export function applyComplianceFooter(
  body: string,
  profile: ComplianceProfile,
): { body: string; manifest: ComplianceManifest } {
  const missing: string[] = [];
  let out = body;
  if (profile.testBannerRequired && !/SANDBOX TEST|INTERNAL TEST/i.test(out)) {
    out = `[SANDBOX TEST — FABRICATED / NON-PRODUCTION]\n${out}`;
  }
  if (!out.includes(profile.footerText.trim()) && profile.footerText) {
    out = `${out}${profile.footerText}`;
  }
  if (profile.stopLanguageRequired && !/\bSTOP\b/i.test(out)) {
    missing.push("STOP_LANGUAGE");
  }
  if (profile.helpLanguageRequired && !/\bHELP\b/i.test(out)) {
    missing.push("HELP_LANGUAGE");
  }
  if (profile.unsubscribeRequired && profile.allowedChannel === "EMAIL") {
    if (!/unsub/i.test(out)) missing.push("UNSUBSCRIBE");
  }
  return {
    body: out,
    manifest: {
      profileKey: profile.key,
      footerApplied: true,
      unsubscribeRequired: profile.unsubscribeRequired,
      stopLanguageRequired: profile.stopLanguageRequired,
      helpLanguageRequired: profile.helpLanguageRequired,
      testBannerRequired: profile.testBannerRequired,
      dispatchEligible: profile.dispatchEligible,
      missingRequirements: missing,
    },
  };
}
