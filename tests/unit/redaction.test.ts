import { describe, expect, it } from "vitest";
import { redactConnectionTarget } from "@/lib/env/server-presence";

describe("redactConnectionTarget", () => {
  it("classifies missing urls", () => {
    expect(redactConnectionTarget(undefined).targetType).toBe("missing");
  });

  it("classifies loopback without exposing credentials", () => {
    const result = redactConnectionTarget(
      "postgresql://user:secret@127.0.0.1:5432/reddirt",
    );
    expect(result.present).toBe(true);
    expect(result.targetType).toBe("local_loopback");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("classifies hosted targets", () => {
    const result = redactConnectionTarget(
      "postgresql://user:secret@db.example.com:5432/app",
    );
    expect(result.targetType).toBe("hosted_postgresql");
  });
});
