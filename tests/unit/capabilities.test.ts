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

  it("marks auth and candidate-data ready when session secret is configured", () => {
    const security = getSecurityCapabilityStatus();
    expect(CURRENT_STEP_NUMBER).toBe(11);
    expect(security.authenticationComplete).toBe(true);
    expect(security.candidateDataReady).toBe(true);
    expect(security.databaseMutationsAuthorized).toBe(true);
    expect(security.rateLimitDistributed).toBe(false);
  });

  it("exposes calendar recovery posture on capability status", async () => {
    const { getCapabilityStatus } = await import("@/lib/system/capabilities");
    const status = getCapabilityStatus();
    expect(status.application.step).toBe(11);
    expect(status.application.communicationsTrack).toBe("FROZEN");
    expect(status.application.lg1Status).toBe("PAUSED");
    expect(status.application.step8CloseoutStatus).toBe("COMPLETE");
    expect(status.application.step9CanonicalEventStatus).toBe("COMPLETE");
    expect(status.application.step10OperatingViewsStatus).toBe("COMPLETE");
    expect(status.application.step11EventEditingStatus).toBe("COMPLETE");
    expect(status.application.operatorUsabilityPassStatus).toBe("OPEN");
    expect(status.application.step12AvailabilityStatus).toBe(
      "COMPLETE_CC05",
    );
    expect(status.application.nextAuthorizedBuild).toBe(
      "KCCC-CC-06-CONFLICT-ENGINE-1.0",
    );
    expect(status.application.calendarCompletionProgramStatus).toBe("LOCKED");
    expect(status.application.unrelatedCampaignExpansionStatus).toBe("PAUSED");
    expect(status.security.candidateDataReady).toBe(true);
  });

  it("keeps candidate-data false when session secret is missing", () => {
    delete process.env.APP_SESSION_SECRET;
    const security = getSecurityCapabilityStatus();
    expect(security.authenticationComplete).toBe(false);
    expect(security.candidateDataReady).toBe(false);
  });
});
