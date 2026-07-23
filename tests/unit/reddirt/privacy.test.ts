import { describe, expect, it } from "vitest";
import {
  assertPersonLevelDenied,
  filterAllowedFields,
  isFieldAllowed,
} from "@/features/reddirt-integration/privacy-allowlist";

describe("reddirt privacy allowlist", () => {
  it("denies email phone street person by default", () => {
    expect(isFieldAllowed("email")).toBe(false);
    expect(isFieldAllowed("phone")).toBe(false);
    expect(isFieldAllowed("street")).toBe(false);
    expect(isFieldAllowed("person")).toBe(false);
    expect(isFieldAllowed("countyFips")).toBe(true);
    expect(isFieldAllowed("factValue")).toBe(true);
  });

  it("strips denied fields and counts exclusions without retaining values", () => {
    const result = filterAllowedFields({
      externalObjectId: "x1",
      countyFips: "05119",
      factKind: "COUNTY_PRIORITY",
      factValue: "HIGH",
      email: "secret@example.com",
      phone: "555-0100",
    });
    expect(result.allowed.email).toBeUndefined();
    expect(result.allowed.phone).toBeUndefined();
    expect(result.allowed.countyFips).toBe("05119");
    expect(result.excludedFieldCount).toBe(2);
    expect(result.excludedFields).toEqual(
      expect.arrayContaining(["email", "phone"]),
    );
  });

  it("detects person-level payloads", () => {
    expect(
      assertPersonLevelDenied({ person: { given_name: "Ada" }, countyFips: "05119" }),
    ).toBe(true);
  });
});
