import { describe, expect, it } from "vitest";
import {
  roleHasFullCalendarAccess,
  roleMayMutate,
  isSystemRole,
} from "@/lib/auth/system-roles";
import { maxAccessLevel, toViewerPermission } from "@/lib/auth/access-level";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  encodeSessionCookie,
  decodeSessionCookie,
  newTokenId,
} from "@/lib/auth/session-cookie";

describe("system roles", () => {
  it("recognizes constitution roles", () => {
    expect(isSystemRole("KELLY")).toBe(true);
    expect(isSystemRole("INTERN")).toBe(false);
  });

  it("gives Kelly and Campaign Manager full calendar access", () => {
    expect(roleHasFullCalendarAccess("KELLY")).toBe(true);
    expect(roleHasFullCalendarAccess("CAMPAIGN_MANAGER")).toBe(true);
    expect(roleHasFullCalendarAccess("STAFF")).toBe(false);
  });

  it("blocks read-only roles from mutations", () => {
    expect(roleMayMutate("READ_ONLY_ADVISOR")).toBe(false);
    expect(roleMayMutate("SYSTEM_AI")).toBe(false);
    expect(roleMayMutate("SCHEDULER")).toBe(true);
  });
});

describe("access level mapping", () => {
  it("merges levels by rank", () => {
    expect(maxAccessLevel("VIEW_LIMITED", "EDIT")).toBe("EDIT");
    expect(toViewerPermission("VIEW_FULL")).toBe("VIEW");
  });
});

describe("password + session cookie", () => {
  it("hashes and verifies passwords", () => {
    const hash = hashPassword("KcccDevOnly-ChangeMe-Step4!");
    expect(verifyPassword("KcccDevOnly-ChangeMe-Step4!", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("round-trips signed session cookies when secret is set", () => {
    process.env.APP_SESSION_SECRET = "unit-test-session-secret-32chars-min!!";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const raw = encodeSessionCookie({
      sid: newTokenId(),
      uid: "user_test",
      role: "KELLY",
      exp,
    });
    const decoded = decodeSessionCookie(raw);
    expect(decoded?.uid).toBe("user_test");
    expect(decoded?.role).toBe("KELLY");
  });
});
