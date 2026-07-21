import { DisabledDispatchProviderAdapter } from "@/lib/missions/v21/communications/dispatch/disabled-adapter";
import { DeterministicTestDispatchAdapter } from "@/lib/missions/v21/communications/dispatch/test-adapter";
import type { CommunicationProviderAdapter } from "@/lib/missions/v21/communications/dispatch/types";

const disabled = new DisabledDispatchProviderAdapter();
const testAdapter = new DeterministicTestDispatchAdapter();

export type ProviderRegistryMode = "production" | "test";

/**
 * Provider registry. Production never returns the test adapter for dispatch.
 * Webhook routes fail closed for unknown providers.
 */
export function listRegisteredProviders(
  mode: ProviderRegistryMode = "production",
): Array<{ providerKey: string; isTestAdapter: boolean; selectable: boolean }> {
  const rows = [
    {
      providerKey: disabled.providerKey,
      isTestAdapter: false,
      selectable: false,
    },
  ];
  if (mode === "test") {
    rows.push({
      providerKey: testAdapter.providerKey,
      isTestAdapter: true,
      selectable: true,
    });
  }
  return rows;
}

export function resolveProviderAdapter(
  providerKey: string | null | undefined,
  options?: { allowTestAdapter?: boolean; nodeEnv?: string },
): CommunicationProviderAdapter {
  const key = (providerKey ?? "disabled").trim().toLowerCase();
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? "production";
  const allowTest =
    options?.allowTestAdapter === true && nodeEnv !== "production";

  if (key === "kccc-test" || key === "test") {
    if (!allowTest) {
      return disabled;
    }
    return testAdapter;
  }
  if (key === "disabled" || key === "") {
    return disabled;
  }
  // Unknown vendor keys fail closed — no speculative vendor adapters.
  return disabled;
}

export function getActiveDispatchProvider(options?: {
  allowTestAdapter?: boolean;
}): CommunicationProviderAdapter {
  const configured = process.env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim();
  return resolveProviderAdapter(configured || "disabled", options);
}

export function getTestDispatchAdapterForUnitTests() {
  return new DeterministicTestDispatchAdapter();
}
