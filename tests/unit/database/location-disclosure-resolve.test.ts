import { describe, expect, it } from "vitest";
import { resolveLocationDisclosure } from "@/server/authorization/resolve-location-disclosure";

describe("resolveLocationDisclosure", () => {
  it("generalizes EXACT to CITY for limited viewers", () => {
    expect(
      resolveLocationDisclosure({
        eventDisclosure: "EXACT",
        viewerAccess: "VIEW_LIMITED",
        isProtectedPersonal: false,
      }),
    ).toBe("CITY");
  });

  it("hides location for protected personal", () => {
    expect(
      resolveLocationDisclosure({
        eventDisclosure: "CITY",
        viewerAccess: "VIEW_LIMITED",
        isProtectedPersonal: true,
      }),
    ).toBe("HIDDEN");
  });
});
