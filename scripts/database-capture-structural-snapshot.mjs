/**
 * Capture read-only structural snapshot (non-kelly schemas).
 * Usage: node scripts/database-capture-structural-snapshot.mjs [label]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const label = process.argv[2] || `snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const result = spawnSync(
  process.execPath,
  ["scripts/database-reddirt-snapshot.mjs", label],
  { cwd: root, stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
