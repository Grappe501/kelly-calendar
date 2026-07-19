import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");

describe("Google Routes secret installer", () => {
  it("supports --routes-only focused mode without echoing secrets", () => {
    const src = readFileSync(
      path.join(root, "scripts/configure-google-integration-secrets.mjs"),
      "utf8",
    );
    expect(src).toContain("--routes-only");
    expect(src).toContain("KCCC_GOOGLE_MAPS_ROUTES_API_KEY");
    expect(src).toContain("promptHiddenSilent");
    expect(src).toContain(".env.local.tmp.kccc");
    expect(src).toContain("assertEnvLocalNotTracked");
    // Must not document unsafe echo patterns as success output
    expect(src).not.toContain("last four");
    expect(src).not.toContain("key length");
  });

  it("Netlify push refuses unsafe argv secret exposure for --routes-only", () => {
    const src = readFileSync(
      path.join(root, "scripts/google-secrets-push-netlify.mjs"),
      "utf8",
    );
    expect(src).toContain("--routes-only");
    expect(src).toContain("KCCC_GOOGLE_MAPS_ROUTES_API_KEY");
    expect(src).toContain("Environment variables");
    expect(src).toMatch(/process arguments/i);
  });

  it("Routes doctor reports presence-only fields and uses latLng ping body", () => {
    const src = readFileSync(
      path.join(root, "scripts/campaign-routes-doctor.mjs"),
      "utf8",
    );
    expect(src).toContain("Routes API key configured");
    expect(src).toContain("Routes integration enabled");
    expect(src).toContain("Routes API reachable");
    expect(src).toContain("Browser exposure");
    expect(src).toContain("X-Goog-Api-Key");
    expect(src).toContain("latLng");
    expect(src).toContain("Failure class");
    expect(src).toContain("CREDENTIAL_KEY_EXPLICIT");
    expect(src).not.toContain('address: "Little Rock, AR"');
  });
});
