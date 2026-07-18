import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;
function fail(m) {
  console.error("FAIL:", m);
  failed = true;
}
function pass(m) {
  console.log("PASS:", m);
}

const required = [
  "prisma/schema.prisma",
  "prisma/migrations/20260718160000_kelly_calendar_foundation/migration.sql",
  "src/server/db/prisma.ts",
  "src/server/auth/auth-status.ts",
  "src/server/authorization/mutation-gate.ts",
  "src/server/services/event-visibility-service.ts",
  "src/server/repositories/event-repository.ts",
  "scripts/database-preflight.mjs",
  "scripts/database-namespace-audit.mjs",
  "scripts/database-seed-reference.mjs",
  "scripts/database-forbidden-sql-scan.mjs",
  "scripts/database-red-dirt-integrity-check.mjs",
  "scripts/database-capture-structural-snapshot.mjs",
  "develop_notes/KCCC_DATABASE_NAMESPACE_PROTOCOL.md",
  "develop_notes/KCCC_STEP_05_IMPLEMENTATION_REPORT.md",
  "develop_notes/KCCC_REDDIRT_DATABASE_INTEGRITY_REPORT.md",
  "develop_notes/KCCC_APPROVAL_AND_AUDIT_MODEL.md",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (!schema.includes('schemas   = ["kelly_calendar"]')) fail("schema namespace missing");
else pass("prisma schemas kelly_calendar");
if (!schema.includes('@@schema("kelly_calendar")')) fail("models missing @@schema");
else pass("models use kelly_calendar");

const sql = fs.readFileSync(
  path.join(root, "prisma/migrations/20260718160000_kelly_calendar_foundation/migration.sql"),
  "utf8",
);
if (/CREATE TABLE\s+"?public"?\./i.test(sql)) fail("migration creates public tables");
else pass("migration avoids public tables");
if (!/CREATE SCHEMA IF NOT EXISTS\s+"kelly_calendar"/i.test(sql)) {
  fail("migration must create kelly_calendar schema");
} else pass("migration creates kelly_calendar");

const build = JSON.parse(fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"));
if (
  build.database_mutations_authorized === true &&
  build.authentication_complete !== true
) {
  fail("mutations cannot be authorized without auth");
} else pass("mutations authorization honest");
if (build.candidate_data_ready === true) {
  fail("candidate_data_ready must stay false until certified");
} else pass("candidate_data_ready remains false");

if (failed) process.exit(1);
console.log("Step 5 validation passed.");
