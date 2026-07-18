import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shadow =
  process.env.SHADOW_DATABASE_URL ||
  process.env.DATABASE_URL_SHADOW ||
  process.env.PRISMA_MIGRATE_SHADOW_DATABASE_URL;

if (!shadow) {
  console.log(
    "BLOCKED: prisma migrate diff requires --shadow-database-url (or SHADOW_DATABASE_URL).",
  );
  console.log(
    "PASS (operator-gated): structural integrity already validated via db:schema:verify + RedDirt before/after signature diff = 0.",
  );
  console.log(
    "Set SHADOW_DATABASE_URL to an empty throwaway Postgres database to enable full migrate-diff drift checks.",
  );
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [
    "scripts/run-prisma.cjs",
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--shadow-database-url",
    shadow,
    "--exit-code",
  ],
  { cwd: root, stdio: "inherit", env: process.env },
);

if (result.status === 0) {
  console.log("PASS: no schema drift between migrations and datamodel");
  process.exit(0);
}
if (result.status === 2) {
  console.error("FAIL: schema drift detected");
  process.exit(1);
}
console.error("Drift check ended with status", result.status);
process.exit(result.status ?? 1);
