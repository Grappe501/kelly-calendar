import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import { CURRENT_STEP_NUMBER } from "@/lib/system/constants";

describe("capability honesty", () => {
  const previous = process.env.APP_SESSION_SECRET;

  beforeEach(() => {
    process.env.APP_SESSION_SECRET = "unit-test-session-secret-32chars-min!!";
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.APP_SESSION_SECRET;
    else process.env.APP_SESSION_SECRET = previous;
  });

  it("marks auth complete when session secret is configured; candidate data stays gated", () => {
    const security = getSecurityCapabilityStatus();
    expect(CURRENT_STEP_NUMBER).toBe(6);
    expect(security.authenticationComplete).toBe(true);
    expect(security.candidateDataReady).toBe(false);
    expect(security.databaseMutationsAuthorized).toBe(true);
    expect(security.rateLimitDistributed).toBe(false);
  });
});
