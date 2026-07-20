/**
 * V2.1 Debrief Mode + full mission unit validation (D1–D5).
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
    "tests/unit/missions/v21-select-todays-mission.test.ts",
    "tests/unit/missions/v21-prepare-mode.test.ts",
    "tests/unit/missions/v21-execute-mode.test.ts",
    "tests/unit/missions/v21-debrief-mode.test.ts",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
