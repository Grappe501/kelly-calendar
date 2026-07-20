/**
 * V2.1 Mobilize Integration Foundation + prior mission unit validation (D1–D16).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "tests/unit/missions/v21-project-event-to-mission.test.ts",
  "tests/unit/missions/v21-select-todays-mission.test.ts",
  "tests/unit/missions/v21-prepare-mode.test.ts",
  "tests/unit/missions/v21-execute-mode.test.ts",
  "tests/unit/missions/v21-debrief-mode.test.ts",
  "tests/unit/missions/v21-follow-up-mode.test.ts",
  "tests/unit/missions/v21-command-center.test.ts",
  "tests/unit/missions/v21-day-briefing.test.ts",
  "tests/unit/missions/v21-day-closeout.test.ts",
  "tests/unit/missions/v21-day-launch.test.ts",
  "tests/unit/missions/v21-travel-movement.test.ts",
  "tests/unit/missions/v21-logistics-pack.test.ts",
  "tests/unit/missions/v21-field-ops.test.ts",
  "tests/unit/missions/v21-incident-log.test.ts",
  "tests/unit/missions/v21-exception-digest.test.ts",
  "tests/unit/missions/v21-mobilize-integration.test.ts",
];
const result = spawnSync(
  process.execPath,
  ["scripts/run-with-h-drive-env.cjs", "npx", "--yes", "vitest", "run", ...files],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
