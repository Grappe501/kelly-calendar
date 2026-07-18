import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/public-paths";

describe("public paths", () => {
  it("allows login and health without session", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("requires auth for app and protected APIs", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/calendar")).toBe(false);
    expect(isPublicPath("/api/events")).toBe(false);
    expect(isPublicPath("/system/status")).toBe(false);
  });
});
