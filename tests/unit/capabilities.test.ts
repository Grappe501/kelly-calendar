import { describe, expect, it } from "vitest";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import { CURRENT_STEP_NUMBER } from "@/lib/system/constants";

describe("capability honesty", () => {
  it("keeps auth incomplete, AI disabled, and candidate data not ready", () => {
    const security = getSecurityCapabilityStatus();
    expect(CURRENT_STEP_NUMBER).toBe(3);
    expect(security.authenticationComplete).toBe(false);
    expect(security.candidateDataReady).toBe(false);
    expect(security.databaseMutationsAuthorized).toBe(false);
    expect(security.rateLimitDistributed).toBe(false);
  });
});
