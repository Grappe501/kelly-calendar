import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyDatabaseTarget, loadApprovedEnv } from "./lib/load-env-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { env, foundFiles } = loadApprovedEnv({ includeRedDirtFallback: true });
const db = classifyDatabaseTarget(env.DATABASE_URL);

const diagnose = spawnSync(
  process.execPath,
  [path.join(repoRoot, "scripts/check-red-dirt-db-connection.mjs")],
  { cwd: repoRoot, encoding: "utf8" },
);
const connectionPass = (diagnose.stdout || "").includes("Connection test: PASS");
const connectionMissing = (diagnose.stdout || "").includes("NOT RUN");

const fallbackEnabled =
  process.env.NETLIFY || process.env.CI
    ? false
    : (env.ENV_FALLBACK_TO_REDDIRT ?? "true").toLowerCase() !== "false";

console.log("Kelly Campaign Command Calendar");
console.log("Environment Readiness");
console.log("");
console.log("Public configuration: PASS");
console.log(`RedDirt fallback: ${fallbackEnabled ? "ENABLED" : "DISABLED"}`);
console.log(`Env files considered: ${foundFiles.length ? foundFiles.join(", ") : "none"}`);
console.log(`Database: ${db.present ? "CONFIGURED" : "MISSING"}`);
console.log(
  `Database connection: ${connectionPass ? "PASS" : connectionMissing ? "NOT RUN" : "FAIL"}`,
);
console.log(`Direct URL: ${env.DIRECT_URL ? "CONFIGURED" : "MISSING"}`);
console.log(
  `Supabase browser: ${env.NEXT_PUBLIC_SUPABASE_URL ? "CONFIGURED" : "MISSING"}`,
);
console.log(
  `Supabase server: ${env.SUPABASE_SERVICE_ROLE_KEY ? "CONFIGURED" : "MISSING"}`,
);
console.log(
  `OpenAI: ${env.OPENAI_API_KEY ? "CONFIGURED, DISABLED" : "MISSING, DISABLED"}`,
);
console.log("Authentication: NOT IMPLEMENTED");
console.log("Candidate data readiness: NO");
