import { describe, expect, it } from "vitest";
import { getCapabilityStatus } from "@/lib/system/capabilities";

describe("getCapabilityStatus", () => {
  it("reports scaffold capabilities without claiming auth or AI", () => {
    const status = getCapabilityStatus({ databaseTested: false });
    expect(status.application.ready).toBe(true);
    expect(status.application.step).toBe(2);
    expect(status.authentication.enabled).toBe(false);
    expect(status.ai.enabled).toBe(false);
    expect(status.ai.authority).toBe("proposal_only");
    expect(status.database.mutable).toBe(false);
    expect(status.database.tested).toBe(false);
  });
});
