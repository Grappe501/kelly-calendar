import { describe, expect, it } from "vitest";
import {
  redactDatabaseUrl,
  redactForLog,
} from "@/lib/env/redact-environment";
import { redactConnectionTarget } from "@/lib/env/server-presence";

describe("redaction", () => {
  it("redacts nested tokens and keeps harmless fields", () => {
    const result = redactForLog({
      title: "Lunch",
      token: "abc123",
      nested: { apiKey: "secret", note: "ok" },
      list: [{ password: "x" }, { city: "Bryant" }],
    }) as Record<string, unknown>;
    expect(result.title).toBe("Lunch");
    expect(result.token).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).note).toBe("ok");
    expect((result.list as Array<Record<string, unknown>>)[1].city).toBe("Bryant");
  });

  it("sanitizes database urls and authorization values", () => {
    const url = redactDatabaseUrl("postgresql://user:secret@db.example.com:5432/app");
    expect(url.protocol).toBe("postgresql");
    expect(url.targetClass).toBe("hosted");
    expect(JSON.stringify(url)).not.toContain("secret");
    expect(JSON.stringify(url)).not.toContain("user");

    const logged = redactForLog({
      authorization: "Bearer abc.def.ghi",
      databaseUrl: "postgresql://user:secret@127.0.0.1:5432/x",
    }) as Record<string, string>;
    expect(logged.authorization).toBe("[REDACTED]");
    expect(logged.databaseUrl).toBe("[REDACTED]");
  });

  it("classifies connection targets without credentials", () => {
    expect(redactConnectionTarget(undefined).targetType).toBe("missing");
    expect(
      redactConnectionTarget("postgresql://user:secret@127.0.0.1:5432/reddirt").targetType,
    ).toBe("local_loopback");
    expect(
      redactConnectionTarget("postgresql://user:secret@db.example.com:5432/app").targetType,
    ).toBe("hosted_postgresql");
  });
});
