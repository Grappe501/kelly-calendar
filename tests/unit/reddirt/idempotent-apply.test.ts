import { describe, expect, it } from "vitest";
import { fingerprintAllowedFields } from "@/features/reddirt-integration/normalize";

/**
 * Pure idempotency logic: same fingerprint → treat as duplicate (0 new facts).
 */
function applyFactOnce(
  store: Map<string, { factKind: string; fingerprint: string }>,
  input: { externalObjectId: string; factKind: string; fingerprint: string },
) {
  const key = `${input.externalObjectId}::${input.factKind}::${input.fingerprint}`;
  if (store.has(key)) return { created: false };
  store.set(key, {
    factKind: input.factKind,
    fingerprint: input.fingerprint,
  });
  return { created: true };
}

describe("reddirt idempotent apply (pure)", () => {
  it("first apply creates one; reapply creates zero duplicates", () => {
    const store = new Map<string, { factKind: string; fingerprint: string }>();
    const fingerprint = fingerprintAllowedFields({
      externalObjectId: "rd-fixture-county-pulaski-priority",
      factKind: "COUNTY_PRIORITY",
      factValue: "HIGH",
      countyFips: "05119",
    });
    const input = {
      externalObjectId: "rd-fixture-county-pulaski-priority",
      factKind: "COUNTY_PRIORITY",
      fingerprint,
    };
    expect(applyFactOnce(store, input).created).toBe(true);
    expect(applyFactOnce(store, input).created).toBe(false);
    expect(store.size).toBe(1);
  });
});
