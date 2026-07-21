import type { CommunicationProviderAdapter } from "@/lib/missions/v21/communications/dispatch/types";
import {
  listProviderRegistry,
  resolveCanonicalProvider,
} from "@/lib/missions/v21/communications/providers";
import { DeterministicTestDispatchAdapter } from "@/lib/missions/v21/communications/dispatch/test-adapter";

export type ProviderRegistryMode = "production" | "test";

/**
 * Provider registry (D21 surface, D22-backed).
 * Production never returns sandbox-only adapters for live campaign dispatch selection.
 */
export function listRegisteredProviders(
  mode: ProviderRegistryMode = "production",
): Array<{ providerKey: string; isTestAdapter: boolean; selectable: boolean }> {
  const catalog = listProviderRegistry();
  return catalog
    .filter((e) => {
      if (e.providerKey === "disabled") return true;
      if (mode === "production") {
        // Production catalog shows official Resend as inspectable, not selectable for prod send.
        return e.isOfficialAdapter && !e.isSandboxOnly;
      }
      return true;
    })
    .map((e) => ({
      providerKey: e.providerKey,
      isTestAdapter: e.isSandboxOnly || e.isStub,
      selectable: mode === "test" && (e.providerKey === "kccc-sandbox" || e.providerKey === "resend"),
    }));
}

export function resolveProviderAdapter(
  providerKey: string | null | undefined,
  options?: { allowTestAdapter?: boolean; nodeEnv?: string },
): CommunicationProviderAdapter {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? "production";
  const allowSandbox =
    options?.allowTestAdapter === true && nodeEnv !== "production";

  const canonical = resolveCanonicalProvider(providerKey, {
    allowSandboxAdapters: allowSandbox,
    nodeEnv,
  });

  // Unknown / stub keys resolve to disabled for actual dispatch I/O.
  if (canonical.isStub) {
    return resolveCanonicalProvider("disabled").asDispatchAdapter();
  }

  return canonical.asDispatchAdapter();
}

export function getActiveDispatchProvider(options?: {
  allowTestAdapter?: boolean;
}): CommunicationProviderAdapter {
  const configured = process.env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim();
  return resolveProviderAdapter(configured || "disabled", options);
}

export function getTestDispatchAdapterForUnitTests() {
  // Preserve D21 unit-test scenarios while D22 sandbox harness covers certification.
  return new DeterministicTestDispatchAdapter();
}
