/**
 * Apply Kelly Calendar migrations via prisma migrate deploy.
 * Requires KCCC_ALLOW_SCHEMA_MIGRATION=1 explicit operator gate.
 * Never resets the database. Never uses db push.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.KCCC_ALLOW_SCHEMA_MIGRATION !== "1") {
  console.error(
    "BLOCKED: Set KCCC_ALLOW_SCHEMA_MIGRATION=1 after reviewing migration SQL and preflight.",
  );
  process.exit(1);
}

console.log("Applying kelly_calendar migrations (migrate deploy)...");
const result = spawnSync(process.execPath, ["scripts/run-prisma.cjs", "migrate", "deploy"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
