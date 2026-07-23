import { describe, expect, it } from "vitest";
import {
  assertAllowlistedRedDirtUrl,
  RedDirtTransportError,
} from "@/features/reddirt-integration/transport";
import { RedDirtAdapter } from "@/features/reddirt-integration/adapter";
import { reddirtConfigStatus } from "@/features/reddirt-integration/config";
import { redactRedDirtDiagnostics } from "@/features/reddirt-integration/redact";
import { IC_02_STATUS, IC_03_STATUS } from "@/lib/system/constants";

describe("reddirt transport and config", () => {
  it("allowlists https placeholder host only", () => {
    expect(
      assertAllowlistedRedDirtUrl("https://api.reddirt.example/v1").host,
    ).toBe("api.reddirt.example");
    expect(() =>
      assertAllowlistedRedDirtUrl("https://evil.example/v1"),
    ).toThrow(RedDirtTransportError);
    expect(() =>
      assertAllowlistedRedDirtUrl("http://api.reddirt.example/v1"),
    ).toThrow(RedDirtTransportError);
  });

  it("adapter makes zero network calls when disabled", async () => {
    let calls = 0;
    const adapter = new RedDirtAdapter({
      apiKey: "test-key",
      baseUrl: "https://api.reddirt.example",
      organizationId: "org",
      readEnabled: false,
      transport: async () => {
        calls += 1;
        return { status: 200, headers: {}, bodyText: "{}" };
      },
    });
    const result = await adapter.verifyConnection();
    expect(result.state).toBe("DISABLED");
    expect(calls).toBe(0);
    expect(adapter.getNetworkCallCount()).toBe(0);
  });

  it("redacts api keys from diagnostics", () => {
    const out = redactRedDirtDiagnostics({
      REDDIRT_API_KEY: "super-secret",
      ok: true,
    }) as Record<string, unknown>;
    expect(out.REDDIRT_API_KEY).toBe("[REDACTED]");
    expect(out.ok).toBe(true);
  });

  it("config defaults readEnabled false / outbound writes false", () => {
    const status = reddirtConfigStatus({
      apiKey: null,
      baseUrl: "https://api.reddirt.example",
      organizationId: null,
      readEnabled: false,
      campaignScopeKey: "KELLY",
    });
    expect(status.connectionStateHint).toBe("NOT_CONFIGURED");
    expect(status.outboundWritesEnabled).toBe(false);
    expect(status.networkReadsAllowed).toBe(false);
  });

  it("IC_03 remains NOT_AUTHORIZED while IC_02 progresses", () => {
    expect(IC_03_STATUS).toBe("NOT_AUTHORIZED");
    expect(["IN_PROGRESS", "COMPLETE"]).toContain(IC_02_STATUS);
  });
});
