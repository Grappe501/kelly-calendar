import { describe, expect, it } from "vitest";
import { getSecureCookieDefaults } from "@/lib/security/cookies";
import {
  getAllowedOrigins,
  isAllowedOrigin,
  isSameOriginRequest,
} from "@/lib/security/origin";
import { isValidRequestId, normalizeRequestId } from "@/lib/security/request-id";
import { resolveSafeRedirect } from "@/lib/security/safe-redirect";
import { toSafeErrorBody, ValidationError } from "@/lib/security/safe-error";

describe("security helpers", () => {
  it("permits internal redirects and rejects unsafe destinations", () => {
    expect(resolveSafeRedirect("/calendar")).toBe("/calendar");
    expect(resolveSafeRedirect("javascript:alert(1)")).toBe("/");
    expect(resolveSafeRedirect("//evil.example")).toBe("/");
    expect(resolveSafeRedirect("https://evil.example/phish")).toBe("/");
    expect(
      resolveSafeRedirect("https://app.example/path", {
        approvedOrigins: ["https://app.example"],
      }),
    ).toBe("/path");
  });

  it("validates request ids and cookie defaults", () => {
    const id = normalizeRequestId("bad id");
    expect(isValidRequestId(id)).toBe(true);
    expect(getSecureCookieDefaults("production")).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  });

  it("checks origins and returns safe error bodies", () => {
    const allowed = getAllowedOrigins({
      appUrl: "https://kccc.example",
      nodeEnv: "production",
    });
    expect(isAllowedOrigin("https://kccc.example", allowed)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", allowed)).toBe(false);
    expect(
      isSameOriginRequest({
        origin: "https://kccc.example",
        host: "kccc.example",
      }),
    ).toBe(true);

    const body = toSafeErrorBody(new ValidationError(), "req_test");
    expect(body.ok).toBe(false);
    expect(body.error.requestId).toBe("req_test");
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
  });
});
