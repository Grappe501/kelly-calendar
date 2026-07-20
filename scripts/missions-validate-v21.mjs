/**
 * Offline V2.1 mission projection validation (seed examples only, no DB).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  [
    "scripts/run-with-h-drive-env.cjs",
    "npx",
    "--yes",
    "vitest",
    "run",
    "tests/unit/missions/v21-project-event-to-mission.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
