import { describe, expect, it } from "vitest";
import { redactAuditPayload } from "@/server/services/audit-service";

describe("audit redaction", () => {
  it("redacts secret-like keys and connection strings", () => {
    const out = redactAuditPayload({
      title: "ok",
      password: "x",
      token: "y",
      nested: { database_url: "postgresql://u:p@h/db", note: "safe" },
    }) as Record<string, unknown>;
    expect(out.title).toBe("ok");
    expect(out.password).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).database_url).toBe("[REDACTED]");
    expect((out.nested as Record<string, unknown>).note).toBe("safe");
  });
});
