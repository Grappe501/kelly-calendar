import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "src/server/auth/session.ts",
  "src/server/auth/provider.ts",
  "src/lib/auth/system-roles.ts",
  "src/app/login/page.tsx",
  "src/app/api/auth/login/route.ts",
  "src/middleware.ts",
  "prisma/migrations/20260718180000_auth_rbac_identity/migration.sql",
  "develop_notes/KCCC_STEP_04_IMPLEMENTATION_REPORT.md",
];

let failed = 0;
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) {
    console.log(`PASS: ${rel}`);
  } else {
    console.error(`FAIL: missing ${rel}`);
    failed += 1;
  }
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const token of ["enum SystemRole", "model User", "model Team", "model TeamMembership", "model AuthSession"]) {
  if (schema.includes(token)) console.log(`PASS: schema ${token}`);
  else {
    console.error(`FAIL: schema missing ${token}`);
    failed += 1;
  }
}

const buildState = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);
if (buildState.completed_steps?.includes("KCCC-STEP-04-AUTH-RBAC")) {
  console.log("PASS: Step 4 in completed_steps");
} else {
  console.error("FAIL: Step 4 not in completed_steps");
  failed += 1;
}
if (buildState.candidate_data_ready === false) {
  console.log("PASS: candidate_data_ready remains false");
} else {
  console.error("FAIL: candidate_data_ready unexpectedly true");
  failed += 1;
}

if (failed) {
  console.error(`Step 4 validation FAILED (${failed}).`);
  process.exit(1);
}
console.log("Step 4 validation passed.");
