export type * from "@/lib/missions/v21/communications/providers/base/provider-types";
export {
  ProviderError,
  defaultRecoveryGuidance,
} from "@/lib/missions/v21/communications/providers/base/provider-errors";
export type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
export {
  allProductionGatesOpen,
  productionDispatchBlockReason,
} from "@/lib/missions/v21/communications/providers/base/provider-interface";
export {
  emptyHealth,
  credentialPresent,
  redactSecretPresence,
} from "@/lib/missions/v21/communications/providers/base/provider-health";
export {
  listProviderRegistry,
  resolveCanonicalProvider,
  getOfficialProviders,
  getSandboxCertificationProvider,
  getResendProvider,
} from "@/lib/missions/v21/communications/providers/base/provider-registry";
export {
  defaultProductionSafetyGates,
  evaluateProductionSafetyGates,
  d22ProductionDispatchHardBlock,
} from "@/lib/missions/v21/communications/providers/base/production-gates";
export {
  PROVIDER_CREDENTIAL_ENV_KEYS,
  inspectCredentialVault,
  credentialVaultOperatorSummary,
} from "@/lib/missions/v21/communications/providers/base/credential-vault";
export {
  bridgeCanonicalToDispatchAdapter,
  mapSendToDispatch,
  mapNormalizedToDelivery,
  hmacSha256Hex,
  replayFingerprint,
} from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";
export { DisabledProviderAdapter } from "@/lib/missions/v21/communications/providers/disabled/adapter";
export { KcccSandboxProvider } from "@/lib/missions/v21/communications/providers/kccc-sandbox/adapter";
export { ResendProviderAdapter } from "@/lib/missions/v21/communications/providers/resend/adapter";
export {
  StubVendorProvider,
  STUB_PROVIDER_SPECS,
} from "@/lib/missions/v21/communications/providers/sendgrid/adapter";
export { MULTI_PROVIDER_ROUTING_ARCHITECTURE } from "@/lib/missions/v21/communications/providers/future/routing-architecture";
