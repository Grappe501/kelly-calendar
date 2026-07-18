/**
 * Presence-only production auth env check.
 * Uses NETLIFY/CI for hard fail; local is advisory unless KCCC_REQUIRE_NETLIFY_ENV=true.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hard =
  process.env.NETLIFY === "true" ||
  process.env.CI === "true" ||
  process.env.KCCC_REQUIRE_NETLIFY_ENV === "true";

function present(name) {
  const v = process.env[name]?.trim();
  return Boolean(v);
}

function secretClass(name) {
  const v = process.env[name]?.trim() ?? "";
  if (!v) return "missing";
  if (v.length < 32) return "too_short";
  if (v === "KcccDevOnly-ChangeMe-Step4!" || v.includes("unit-test-session")) {
    return "development_default";
  }
  return "present_length_ok";
}

const matrix = [
  ["APP_SESSION_SECRET", true, secretClass("APP_SESSION_SECRET")],
  ["DATABASE_URL", true, present("DATABASE_URL") ? "present" : "missing"],
  ["DIRECT_URL", true, present("DIRECT_URL") ? "present" : "missing"],
];

console.log("Environment matrix (values never printed):");
for (const [name, required, result] of matrix) {
  console.log(`- ${name}: required=${required} result=${result}`);
}

const localEnv = fs.existsSync(path.join(root, ".env.local"));
console.log(`local .env.local present: ${localEnv ? "yes" : "no"}`);

const target = JSON.parse(
  fs.readFileSync(path.join(root, "data/netlify_target.json"), "utf8"),
);
console.log(`Netlify target status: ${target.status}`);
console.log("Netlify env present: unknown (operator / CLI login required)");

if (!hard) {
  console.log("PASS: local advisory — production Netlify env not yet proven");
  console.log("BLOCKED — OPERATOR ACTION REQUIRED for Netlify APP_SESSION_SECRET");
  process.exit(0);
}

let failed = false;
for (const [name, , result] of matrix) {
  if (result === "missing" || result === "too_short" || result === "development_default") {
    console.error(`FAIL: ${name} ${result}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("PASS: production auth env present (values not printed)");
