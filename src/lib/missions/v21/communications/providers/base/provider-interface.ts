import type {
  CredentialCheck,
  NormalizedProviderEvent,
  ProductionSafetyGates,
  ProviderHealthReport,
  ProviderSendInput,
  ProviderSendResult,
  ProviderStatusQuery,
  ProviderStatusResult,
  ProviderVerifyResult,
  SandboxCertificationCheckResult,
  SuppressionSyncResult,
  WebhookValidationInput,
  WebhookValidationResult,
} from "@/lib/missions/v21/communications/providers/base/provider-types";
import type { CommunicationProviderAdapter } from "@/lib/missions/v21/communications/dispatch/types";

/**
 * Canonical provider interface (D22).
 * No provider code may bypass this interface for outbound vendor I/O.
 */
export interface CanonicalCommunicationsProvider {
  readonly providerKey: string;
  readonly displayName: string;
  readonly isOfficialAdapter: boolean;
  readonly isSandboxOnly: boolean;
  readonly isStub: boolean;

  initialize(): Promise<void>;
  verify(): Promise<ProviderVerifyResult>;
  health(): Promise<ProviderHealthReport>;
  preflight(input: ProviderSendInput): Promise<{
    ok: boolean;
    blockingReasons: string[];
  }>;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
  cancel(input: {
    providerMessageId: string;
    reason: string;
  }): Promise<{ ok: boolean; redactedSummary: string }>;
  status(input: ProviderStatusQuery): Promise<ProviderStatusResult>;
  batchStatus(
    inputs: ProviderStatusQuery[],
  ): Promise<ProviderStatusResult[]>;
  syncSuppressions(input?: {
    since?: string;
  }): Promise<SuppressionSyncResult>;
  validateWebhook(
    input: WebhookValidationInput,
  ): Promise<WebhookValidationResult>;
  processWebhook(
    input: WebhookValidationInput,
  ): Promise<{
    validation: WebhookValidationResult;
    events: NormalizedProviderEvent[];
  }>;
  normalizeDelivery(raw: unknown): NormalizedProviderEvent | null;
  normalizeBounce(raw: unknown): NormalizedProviderEvent | null;
  normalizeComplaint(raw: unknown): NormalizedProviderEvent | null;
  normalizeOpen(raw: unknown): NormalizedProviderEvent | null;
  normalizeClick(raw: unknown): NormalizedProviderEvent | null;
  normalizeFailure(raw: unknown): NormalizedProviderEvent | null;
  inspectCredentials(): Promise<CredentialCheck[]>;
  runSandboxCertification(): Promise<SandboxCertificationCheckResult[]>;
  shutdown(): Promise<void>;

  /** Bridge to D21 dispatch adapter contract. */
  asDispatchAdapter(): CommunicationProviderAdapter;
}

export function allProductionGatesOpen(gates: ProductionSafetyGates): boolean {
  return (
    gates.productionProviderSelected &&
    gates.sandboxPassed &&
    gates.senderVerified &&
    gates.domainVerified &&
    gates.webhookVerified &&
    gates.killSwitchOff &&
    gates.operatorApproval &&
    gates.campaignApproval &&
    gates.finalConfirmation &&
    gates.controlledLiveTestApproved
  );
}

export function productionDispatchBlockReason(
  gates: ProductionSafetyGates,
): string | null {
  if (allProductionGatesOpen(gates)) return null;
  const missing: string[] = [];
  if (!gates.productionProviderSelected) missing.push("Production Provider Selected");
  if (!gates.sandboxPassed) missing.push("Sandbox Passed");
  if (!gates.senderVerified) missing.push("Sender Verified");
  if (!gates.domainVerified) missing.push("Domain Verified");
  if (!gates.webhookVerified) missing.push("Webhook Verified");
  if (!gates.killSwitchOff) missing.push("Kill Switch OFF");
  if (!gates.operatorApproval) missing.push("Operator Approval");
  if (!gates.campaignApproval) missing.push("Campaign Approval");
  if (!gates.finalConfirmation) missing.push("Final Confirmation");
  if (!gates.controlledLiveTestApproved) {
    missing.push("Controlled Live Test Approved");
  }
  return `DISPATCH BLOCKED — missing: ${missing.join(", ")}`;
}
