import type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type {
  ProviderCapabilityMatrix,
  ProviderRegistryEntry,
} from "@/lib/missions/v21/communications/providers/base/provider-types";
import { DisabledProviderAdapter } from "@/lib/missions/v21/communications/providers/disabled/adapter";
import { KcccSandboxProvider } from "@/lib/missions/v21/communications/providers/kccc-sandbox/adapter";
import { ResendProviderAdapter } from "@/lib/missions/v21/communications/providers/resend/adapter";
import {
  StubVendorProvider,
  STUB_PROVIDER_SPECS,
} from "@/lib/missions/v21/communications/providers/sendgrid/adapter";

const disabled = new DisabledProviderAdapter();
const sandbox = new KcccSandboxProvider();
const resend = new ResendProviderAdapter();
const stubs = STUB_PROVIDER_SPECS.map((spec) => new StubVendorProvider(spec));

const byKey = new Map<string, CanonicalCommunicationsProvider>([
  [disabled.providerKey, disabled],
  [sandbox.providerKey, sandbox],
  ["kccc-test", sandbox], // D21 alias → D22 sandbox harness
  [resend.providerKey, resend],
  ...stubs.map((s) => [s.providerKey, s] as const),
]);

const SANDBOX_CAPS: ProviderCapabilityMatrix = {
  email: true,
  sms: true,
  mms: false,
  attachments: false,
  bulkSend: true,
  rateLimits: true,
  webhookSupport: true,
  sandboxSupport: true,
  dedicatedIp: false,
  domainVerification: true,
  suppressionApi: true,
  analytics: false,
  pricingKnown: true,
  productionReady: false,
};

const RESEND_CAPS: ProviderCapabilityMatrix = {
  email: true,
  sms: false,
  mms: false,
  attachments: true,
  bulkSend: true,
  rateLimits: true,
  webhookSupport: true,
  sandboxSupport: true,
  dedicatedIp: false,
  domainVerification: true,
  suppressionApi: true,
  analytics: true,
  pricingKnown: false,
  productionReady: false,
};

/**
 * Provider Registry (D22 Phase 1) — status, capabilities, operator notes.
 */
export function listProviderRegistry(): ProviderRegistryEntry[] {
  return [
    {
      providerKey: "disabled",
      displayName: "Disabled",
      status: "DISABLED",
      capabilities: {
        ...SANDBOX_CAPS,
        email: false,
        sms: false,
        sandboxSupport: false,
        webhookSupport: false,
      },
      isOfficialAdapter: false,
      isSandboxOnly: true,
      isStub: false,
      operatorNotes: ["Fail-closed default."],
    },
    {
      providerKey: "kccc-sandbox",
      displayName: "KCCC Sandbox Certification",
      status: "SANDBOX_READY",
      capabilities: SANDBOX_CAPS,
      isOfficialAdapter: true,
      isSandboxOnly: true,
      isStub: false,
      operatorNotes: [
        "Official sandbox certification harness.",
        "Cannot be selected for production.",
      ],
    },
    {
      providerKey: "resend",
      displayName: "Resend",
      status: process.env.KCCC_RESEND_API_KEY?.trim() ? "INSTALLED" : "AVAILABLE",
      capabilities: RESEND_CAPS,
      isOfficialAdapter: true,
      isSandboxOnly: false,
      isStub: false,
      operatorNotes: [
        "Official D22 commercial adapter (server fetch, no SDK).",
        "Production dispatch remains blocked by safety gates.",
      ],
    },
    ...STUB_PROVIDER_SPECS.map((spec) => ({
      providerKey: spec.providerKey,
      displayName: spec.displayName,
      status: "AVAILABLE" as const,
      capabilities: spec.capabilities,
      isOfficialAdapter: false,
      isSandboxOnly: true,
      isStub: true,
      operatorNotes: spec.operatorNotes,
    })),
  ];
}

export function resolveCanonicalProvider(
  providerKey: string | null | undefined,
  options?: { allowSandboxAdapters?: boolean; nodeEnv?: string },
): CanonicalCommunicationsProvider {
  const key = (providerKey ?? "disabled").trim().toLowerCase();
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? "production";
  const allowSandbox =
    options?.allowSandboxAdapters === true || nodeEnv !== "production";

  if (key === "disabled" || key === "") return disabled;

  if (key === "kccc-sandbox" || key === "kccc-test" || key === "test") {
    if (!allowSandbox) return disabled;
    return sandbox;
  }

  if (key === "resend") {
    return resend;
  }

  const stub = byKey.get(key);
  if (stub?.isStub) {
    // Stubs never dispatch; returning them is safe for catalog/health.
    return stub;
  }

  return disabled;
}

export function getOfficialProviders(): CanonicalCommunicationsProvider[] {
  return [sandbox, resend];
}

export function getSandboxCertificationProvider(): KcccSandboxProvider {
  return sandbox;
}

export function getResendProvider(): ResendProviderAdapter {
  return resend;
}
