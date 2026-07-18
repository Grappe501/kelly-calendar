/**
 * Step 4 AUTH-RBAC validation gate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildState = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const checks = [
  {
    name: "Authentication provider configured",
    pass: exists("src/server/auth/provider.ts"),
    detail: "src/server/auth/provider.ts missing",
  },
  {
    name: "Authenticated user identity contract",
    pass: exists("src/server/auth/session.ts"),
    detail: "src/server/auth/session.ts missing",
  },
  {
    name: "System roles exist",
    pass:
      exists("src/lib/auth/system-roles.ts") &&
      fs
        .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
        .includes("enum SystemRole"),
    detail: "SystemRole enum / system-roles module missing",
  },
  {
    name: "Team membership model exists",
    pass: fs
      .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
      .includes("model TeamMembership"),
    detail: "TeamMembership model missing",
  },
  {
    name: "Calendar permission vocabulary exists",
    pass: exists("src/lib/calendar-security/calendar-access-types.ts"),
    detail: "Vocabulary missing",
  },
  {
    name: "Protected routes enforced",
    pass:
      exists("src/middleware.ts") &&
      fs
        .readFileSync(path.join(root, "src/middleware.ts"), "utf8")
        .includes("decodeSessionCookieEdge") &&
      exists("src/lib/auth/public-paths.ts"),
    detail: "Middleware auth gate missing",
  },
  {
    name: "Session validation server-side",
    pass:
      exists("src/server/auth/session.ts") &&
      fs
        .readFileSync(path.join(root, "src/server/auth/session.ts"), "utf8")
        .includes("getSessionViewer"),
    detail: "getSessionViewer missing",
  },
  {
    name: "Login API exists",
    pass: exists("src/app/api/auth/login/route.ts"),
    detail: "Login route missing",
  },
  {
    name: "Login page exists",
    pass: exists("src/app/login/page.tsx"),
    detail: "Login page missing",
  },
  {
    name: "User identity model exists",
    pass: fs
      .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
      .includes("model User"),
    detail: "User model missing",
  },
  {
    name: "Auth migration exists",
    pass: exists(
      "prisma/migrations/20260718180000_auth_rbac_identity/migration.sql",
    ),
    detail: "Auth migration missing",
  },
  {
    name: "Unauthorized API rejection helpers",
    pass: exists("src/server/authorization/mutation-gate.ts"),
    detail: "Mutation gate missing",
  },
  {
    name: "build_state.authentication_complete honest",
    pass: buildState.authentication_complete === true,
    detail: `authentication_complete=${buildState.authentication_complete} (expected true after Step 4)`,
  },
  {
    name: "Step 4 listed complete",
    pass:
      Array.isArray(buildState.completed_steps) &&
      buildState.completed_steps.includes("KCCC-STEP-04-AUTH-RBAC"),
    detail: "completed_steps must include KCCC-STEP-04-AUTH-RBAC",
  },
  {
    name: "Candidate data remains gated",
    pass: buildState.candidate_data_ready === false,
    detail: "candidate_data_ready must stay false until certified",
  },
];

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`PASS: ${check.name}`);
  } else {
    console.error(`FAIL: ${check.name} — ${check.detail}`);
    failed += 1;
  }
}

console.log("");
if (failed > 0) {
  console.error(`Auth validation FAILED (${failed} gates).`);
  process.exit(1);
}
console.log("Auth validation PASSED (Step 4 AUTH-RBAC).");
process.exit(0);
