/**
 * Step 4 prerequisite gate for Step 5+.
 * Reports missing auth honestly. Exit 1 only on inconsistent claims
 * (auth/mutations marked complete while gates are missing).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildState = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);

const checks = [
  {
    name: "Authentication provider configured",
    pass: false,
    detail: "No auth provider module (Step 4 not implemented)",
  },
  {
    name: "Authenticated user identity contract",
    pass: fs.existsSync(path.join(root, "src/server/auth/session.ts")),
    detail: "src/server/auth/session.ts missing",
  },
  {
    name: "System roles exist",
    pass: false,
    detail: "Role model not implemented",
  },
  {
    name: "Team membership model exists",
    pass: false,
    detail: "Team membership not implemented",
  },
  {
    name: "Calendar permission vocabulary exists",
    pass: fs.existsSync(
      path.join(root, "src/lib/calendar-security/calendar-access-types.ts"),
    ),
    detail: "Vocabulary stub from Step 3 only — not live RBAC",
  },
  {
    name: "Protected routes enforced",
    pass: false,
    detail: "No auth middleware gate for mutations",
  },
  {
    name: "Session validation server-side",
    pass: false,
    detail: "No session validator",
  },
  {
    name: "Unauthorized API rejection",
    pass:
      fs.existsSync(path.join(root, "src/server/authorization/mutation-gate.ts")) &&
      buildState.database_mutations_authorized === false,
    detail: "Mutation gate must keep mutations unauthorized until Step 4",
  },
  {
    name: "build_state.authentication_complete honest",
    pass: buildState.authentication_complete === false,
    detail: `authentication_complete=${buildState.authentication_complete} (must be false until Step 4)`,
  },
  {
    name: "Step 4 not falsely completed",
    pass: !(
      Array.isArray(buildState.completed_steps) &&
      buildState.completed_steps.includes("KCCC-STEP-04-AUTH-RBAC")
    ),
    detail: "Do not list Step 4 complete until auth is implemented",
  },
];

let missing = 0;
let inconsistent = 0;

for (const check of checks) {
  if (check.pass) {
    console.log(`PASS: ${check.name}`);
  } else {
    console.error(`BLOCKED: ${check.name} — ${check.detail}`);
    missing += 1;
  }
}

if (buildState.authentication_complete === true) {
  console.error("FAIL: authentication_complete=true while Step 4 gates are incomplete");
  inconsistent += 1;
}
if (buildState.database_mutations_authorized === true) {
  console.error("FAIL: database_mutations_authorized=true while Step 4 incomplete");
  inconsistent += 1;
}
if (buildState.candidate_data_ready === true) {
  console.error("FAIL: candidate_data_ready=true while Step 4 incomplete");
  inconsistent += 1;
}

console.log("");
if (inconsistent > 0) {
  console.error(`Auth validation FAILED (${inconsistent} inconsistent claims).`);
  process.exit(1);
}

console.log(
  `Auth validation BLOCKED (${missing} open Step 4 gates). Schema work may proceed; live mutations and candidate-data entry remain disabled.`,
);
process.exit(0);
