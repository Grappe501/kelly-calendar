import { describe, expect, it } from "vitest";
import { mutationsAuthorized, requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

describe("mutation gate", () => {
  it("keeps mutations unauthorized until Step 4", () => {
    expect(mutationsAuthorized()).toBe(false);
    expect(() => requireAuthorizedMutation("createEvent")).toThrow();
  });
});
