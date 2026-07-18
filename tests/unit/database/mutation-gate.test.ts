import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  mutationsAuthorized,
  requireAuthorizedMutation,
} from "@/server/authorization/mutation-gate";

describe("mutation gate", () => {
  const previous = process.env.APP_SESSION_SECRET;

  beforeEach(() => {
    process.env.APP_SESSION_SECRET = "unit-test-session-secret-32chars-min!!";
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.APP_SESSION_SECRET;
    else process.env.APP_SESSION_SECRET = previous;
  });

  it("allows mutations when Step 4 secret is configured and actor may mutate", () => {
    expect(mutationsAuthorized()).toBe(true);
    expect(() =>
      requireAuthorizedMutation("createEvent", {
        userId: "u1",
        systemRole: "KELLY",
      }),
    ).not.toThrow();
  });

  it("rejects mutations without an actor", () => {
    expect(() => requireAuthorizedMutation("createEvent")).toThrow();
  });

  it("rejects read-only roles", () => {
    expect(() =>
      requireAuthorizedMutation("createEvent", {
        userId: "u2",
        systemRole: "READ_ONLY_ADVISOR",
      }),
    ).toThrow();
  });
});
