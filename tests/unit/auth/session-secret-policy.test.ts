import { describe, expect, it, afterEach } from "vitest";
import {
  classifyAppSessionSecret,
  assertProductionSessionSecretOrThrow,
} from "@/lib/auth/session-secret-policy";

describe("session secret policy", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it("rejects missing and short secrets", () => {
    expect(classifyAppSessionSecret(undefined).present).toBe(false);
    expect(classifyAppSessionSecret("short").lengthOk).toBe(false);
  });

  it("rejects development default", () => {
    const c = classifyAppSessionSecret("KcccDevOnly-ChangeMe-Step4!");
    expect(c.productionSafe).toBe(false);
  });

  it("accepts strong secret", () => {
    const c = classifyAppSessionSecret("a".repeat(48));
    expect(c.productionSafe).toBe(true);
  });

  it("fails closed in production for missing secret", () => {
    process.env.NETLIFY = "true";
    process.env.CONTEXT = "production";
    expect(() => assertProductionSessionSecretOrThrow(undefined)).toThrow(
      /APP_SESSION_SECRET/,
    );
  });
});
