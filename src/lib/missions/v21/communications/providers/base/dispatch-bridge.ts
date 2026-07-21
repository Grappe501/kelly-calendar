import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch/preflight";
import type {
  ApprovedDispatchInput,
  CommunicationProviderAdapter,
  DispatchPreflightInput,
  DispatchReconciliationInput,
  NormalizedDeliveryEvent,
  ProviderCapabilityFlag,
  ProviderCapabilityReport,
  ProviderConfigurationState,
  ProviderConnectionResult,
  ProviderDispatchResult,
  RawWebhookInput,
  SenderValidationInput,
  VerifiedWebhookResult,
} from "@/lib/missions/v21/communications/dispatch/types";
import type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type {
  NormalizedProviderEvent,
  ProviderSendInput,
  ProviderSendResult,
} from "@/lib/missions/v21/communications/providers/base/provider-types";

export function mapNormalizedToDelivery(
  events: NormalizedProviderEvent[],
): NormalizedDeliveryEvent[] {
  return events.map((e) => ({
    eventType: mapEventType(e.eventType),
    providerMessageId: e.providerMessageId,
    occurredAt: e.occurredAt,
    suppressionAction: e.suppressionAction,
  }));
}

function mapEventType(
  t: NormalizedProviderEvent["eventType"],
): NormalizedDeliveryEvent["eventType"] {
  switch (t) {
    case "DELIVERED":
      return "DELIVERED";
    case "BOUNCED":
      return "BOUNCED";
    case "COMPLAINED":
      return "COMPLAINT";
    case "OPENED":
      return "CLICKED";
    case "CLICKED":
      return "CLICKED";
    case "FAILED":
      return "FAILED";
    case "ACCEPTED":
      return "DISPATCH_ACCEPTED";
    case "DEFERRED":
      return "FAILED";
    default:
      return "UNSUPPORTED";
  }
}

export function mapSendToDispatch(
  result: ProviderSendResult,
): ProviderDispatchResult {
  if (result.outcome === "ACCEPTED") {
    return {
      outcome: "ACCEPTED",
      providerMessageId: result.providerMessageId,
      acceptedAt: result.acceptedAt,
    };
  }
  if (result.outcome === "BLOCKED") {
    return {
      outcome: "BLOCKED",
      errorCategory: result.errorCategory,
      completedAt: new Date().toISOString(),
    };
  }
  if (result.outcome === "TIMEOUT") {
    return {
      outcome: "UNKNOWN",
      errorCategory: result.errorCategory,
      completedAt: new Date().toISOString(),
    };
  }
  return {
    outcome: "REJECTED",
    errorCategory: result.errorCategory,
    permanent: result.outcome === "REJECTED_PERMANENT",
    completedAt: new Date().toISOString(),
  };
}

export function sendInputFromApproved(
  input: ApprovedDispatchInput,
): ProviderSendInput {
  return {
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    channel: input.channel === "SMS" ? "SMS" : "EMAIL",
    destination: input.destinationRef,
    subject: input.subject ?? null,
    bodyText: input.bodyText ?? "",
    bodyHtml: null,
    fromIdentity: null,
    sandboxOnly: input.mode !== "PRODUCTION",
    timeoutMs: input.timeoutMs,
  };
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function replayFingerprint(
  providerKey: string,
  providerEventId: string | null,
  rawBody: string,
): string {
  const base = `${providerKey}|${providerEventId ?? ""}|${createHash("sha256").update(rawBody).digest("hex")}`;
  return createHash("sha256").update(base).digest("hex");
}

function capabilityFlags(partial: Partial<Record<ProviderCapabilityFlag, "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" | "DISABLED">>): Record<ProviderCapabilityFlag, "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" | "DISABLED"> {
  const base: Record<ProviderCapabilityFlag, "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" | "DISABLED"> = {
    ADAPTER_IMPLEMENTED: "UNSUPPORTED",
    CONFIGURATION_PRESENT: "UNSUPPORTED",
    CREDENTIALS_VERIFIED: "UNSUPPORTED",
    SENDER_VERIFIED: "UNSUPPORTED",
    SANDBOX_AVAILABLE: "UNSUPPORTED",
    EMAIL_ENABLED: "UNSUPPORTED",
    SMS_ENABLED: "UNSUPPORTED",
    BATCH_DISPATCH: "UNSUPPORTED",
    NATIVE_IDEMPOTENCY: "UNSUPPORTED",
    STATUS_RECONCILIATION: "UNSUPPORTED",
    SIGNED_WEBHOOKS: "UNSUPPORTED",
    DELIVERY_EVENTS: "UNSUPPORTED",
    BOUNCE: "UNSUPPORTED",
    COMPLAINT: "UNSUPPORTED",
    UNSUBSCRIBE: "UNSUPPORTED",
    REPLY: "UNSUPPORTED",
    CLICK_TRACKING: "UNSUPPORTED",
    SUPPRESSION_SYNC: "UNSUPPORTED",
    PRODUCTION_DISPATCH_APPLICATION_ENABLED: "DISABLED",
  };
  return { ...base, ...partial };
}

/**
 * Bridge CanonicalCommunicationsProvider → D21 CommunicationProviderAdapter.
 */
export function bridgeCanonicalToDispatchAdapter(
  provider: CanonicalCommunicationsProvider,
  options?: {
    isTestAdapter?: boolean;
    supportedChannels?: CommunicationProviderAdapter["supportedChannels"];
    capabilityVersion?: string;
  },
): CommunicationProviderAdapter {
  const isTestAdapter = options?.isTestAdapter ?? provider.isSandboxOnly;
  const supportedChannels = options?.supportedChannels ?? (["EMAIL"] as const);
  const capabilityVersion =
    options?.capabilityVersion ?? `d22-${provider.providerKey}-1`;

  return {
    providerKey: provider.providerKey,
    supportedChannels: [...supportedChannels],
    isTestAdapter,
    async inspectConfiguration(): Promise<ProviderConfigurationState> {
      const health = await provider.health();
      const creds = await provider.inspectCredentials();
      const present = creds.some((c) => c.status === "PRESENT");
      return {
        providerKey: provider.providerKey,
        mode: "DISABLED",
        configured: present || !provider.isStub,
        credentialsPresent: present || provider.isSandboxOnly,
        credentialsVerified:
          health.authentication === "PRESENT" || provider.isSandboxOnly,
        senderVerified: health.senderVerified || provider.isSandboxOnly,
        sandboxAvailable: true,
        applicationDispatchEnabled: false,
        webhooksEnabled: health.webhookVerified || provider.isSandboxOnly,
        notes: health.notes,
      };
    },
    async verifyConnection(): Promise<ProviderConnectionResult> {
      const v = await provider.verify();
      return {
        ok: v.ok,
        mode: v.mode === "SANDBOX" ? "SANDBOX" : "DISABLED",
        verifiedAt: v.verifiedAt,
        errorCategory: v.errorCategory,
        redactedSummary: v.redactedSummary,
      };
    },
    async discoverCapabilities(): Promise<ProviderCapabilityReport> {
      const health = await provider.health();
      return {
        providerKey: provider.providerKey,
        capabilityVersion,
        flags: capabilityFlags({
          ADAPTER_IMPLEMENTED: provider.isStub ? "UNKNOWN" : "SUPPORTED",
          CONFIGURATION_PRESENT:
            health.authentication === "PRESENT" || provider.isSandboxOnly
              ? "SUPPORTED"
              : "UNSUPPORTED",
          CREDENTIALS_VERIFIED:
            health.authentication === "PRESENT" || provider.isSandboxOnly
              ? "SUPPORTED"
              : "UNSUPPORTED",
          SENDER_VERIFIED:
            health.senderVerified || provider.isSandboxOnly
              ? "SUPPORTED"
              : "UNSUPPORTED",
          SANDBOX_AVAILABLE: "SUPPORTED",
          EMAIL_ENABLED: supportedChannels.includes("EMAIL")
            ? "SUPPORTED"
            : "UNSUPPORTED",
          SMS_ENABLED: supportedChannels.includes("SMS")
            ? "SUPPORTED"
            : "UNSUPPORTED",
          BATCH_DISPATCH: "SUPPORTED",
          NATIVE_IDEMPOTENCY: "SUPPORTED",
          STATUS_RECONCILIATION: "SUPPORTED",
          SIGNED_WEBHOOKS:
            health.webhookVerified || provider.isSandboxOnly
              ? "SUPPORTED"
              : "UNSUPPORTED",
          DELIVERY_EVENTS: "SUPPORTED",
          BOUNCE: "SUPPORTED",
          COMPLAINT: "SUPPORTED",
          UNSUBSCRIBE: "SUPPORTED",
          SUPPRESSION_SYNC: "SUPPORTED",
          PRODUCTION_DISPATCH_APPLICATION_ENABLED: "DISABLED",
        }),
      };
    },
    async validateSender(input: SenderValidationInput) {
      if (!input.senderIdentity && !provider.isSandboxOnly) {
        return { ok: false, verified: false, reasonCodes: ["SENDER_MISSING"] };
      }
      const health = await provider.health();
      const ok = health.senderVerified || provider.isSandboxOnly;
      return {
        ok,
        verified: ok,
        reasonCodes: ok ? [] : ["SENDER_UNVERIFIED"],
      };
    },
    async preflight(input: DispatchPreflightInput) {
      return evaluateDispatchPreflight(input);
    },
    async dispatch(input: ApprovedDispatchInput): Promise<ProviderDispatchResult> {
      if (input.mode === "PRODUCTION") {
        return {
          outcome: "BLOCKED",
          errorCategory: "PRODUCTION_BLOCKED",
          completedAt: new Date().toISOString(),
        };
      }
      const result = await provider.send(sendInputFromApproved(input));
      return mapSendToDispatch(result);
    },
    async reconcile(input: DispatchReconciliationInput) {
      if (!input.providerMessageId) {
        return {
          found: false,
          providerMessageId: null,
          status: "NOT_FOUND" as const,
        };
      }
      const status = await provider.status({
        providerMessageId: input.providerMessageId,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        found: status.found,
        providerMessageId: input.providerMessageId,
        status: status.found
          ? status.state === "REJECTED"
            ? ("REJECTED" as const)
            : ("ACCEPTED" as const)
          : ("NOT_FOUND" as const),
      };
    },
    async verifyWebhook(input: RawWebhookInput): Promise<VerifiedWebhookResult> {
      const processed = await provider.processWebhook({
        headers: input.headers,
        rawBody: input.rawBody,
        receivedAt: input.receivedAtIso,
      });
      const validation = processed.validation;
      if (!validation.valid) {
        return {
          ok: false,
          providerKey: provider.providerKey,
          providerEventId: null,
          providerEventAt: null,
          replayFingerprint: validation.replayFingerprint,
          signatureValid: false,
          rejectionCategory: validation.errorCategory,
          events: [],
        };
      }
      return {
        ok: true,
        providerKey: provider.providerKey,
        providerEventId: validation.providerEventId,
        providerEventAt: validation.providerEventAt,
        replayFingerprint: validation.replayFingerprint,
        signatureValid: true,
        rejectionCategory: null,
        events: processed.events.map((e) => ({
          type: e.eventType,
          providerMessageId: e.providerMessageId,
          occurredAt: e.occurredAt,
        })),
      };
    },
    async normalizeWebhook(
      input: VerifiedWebhookResult,
    ): Promise<NormalizedDeliveryEvent[]> {
      if (!input.ok) return [];
      return input.events.map((e) => {
        const mapped = mapEventType(
          (e.type as NormalizedProviderEvent["eventType"]) || "UNSUPPORTED",
        );
        return {
          eventType: mapped,
          providerMessageId: e.providerMessageId,
          occurredAt: e.occurredAt,
          suppressionAction:
            mapped === "COMPLAINT"
              ? "COMPLAINT"
              : mapped === "BOUNCED"
                ? "INVALID_DESTINATION"
                : "NONE",
        };
      });
    },
  };
}
