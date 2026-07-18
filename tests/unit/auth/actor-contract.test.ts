import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("actor contract source rules", () => {
  it("resolves actor from session modules, not request body", () => {
    const root = process.cwd();
    const actor = fs.readFileSync(path.join(root, "src/server/auth/actor.ts"), "utf8");
    const api = fs.readFileSync(path.join(root, "src/server/auth/api-mutation.ts"), "utf8");
    expect(actor).toContain("getSessionViewer");
    expect(actor).toContain("requireAuthenticatedActor");
    expect(api).toContain("requireActiveAuthenticatedActor");
    expect(api).toContain("runWithActorAsync");
    expect(actor).not.toMatch(/body\.userId/);
    expect(api).not.toMatch(/body\.actorUserId/);
  });
});
