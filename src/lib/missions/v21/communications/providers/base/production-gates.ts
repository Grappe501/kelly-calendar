import {
  allProductionGatesOpen,
  productionDispatchBlockReason,
} from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type { ProductionSafetyGates } from "@/lib/missions/v21/communications/providers/base/provider-types";

/** D22 default — every gate closed; production impossible. */
export function defaultProductionSafetyGates(): ProductionSafetyGates {
  return {
    productionProviderSelected: false,
    sandboxPassed: false,
    senderVerified: false,
    domainVerified: false,
    webhookVerified: false,
    killSwitchOff: false,
    operatorApproval: false,
    campaignApproval: false,
    finalConfirmation: false,
    controlledLiveTestApproved: false,
  };
}

export function evaluateProductionSafetyGates(gates: ProductionSafetyGates): {
  allowed: boolean;
  blockReason: string | null;
  gates: ProductionSafetyGates;
} {
  const allowed = allProductionGatesOpen(gates);
  return {
    allowed,
    blockReason: productionDispatchBlockReason(gates),
    gates,
  };
}

/**
 * Hard rule: even if gates somehow flip, D22 code paths must still refuse
 * PRODUCTION mode until a future deliverable explicitly enables it.
 */
export function d22ProductionDispatchHardBlock(): {
  blocked: true;
  reason: string;
} {
  return {
    blocked: true,
    reason:
      "DISPATCH BLOCKED — D22 forbids production communication. Complete all safety gates in a future enablement pass.",
  };
}
