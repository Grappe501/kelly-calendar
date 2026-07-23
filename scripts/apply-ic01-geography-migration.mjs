/**
 * Apply IC-01 geography foundation SQL when migrate deploy history is diverged.
 * Gate: KCCC_ALLOW_SCHEMA_MIGRATION=1
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "20260723120000_ic01_arkansas_campaign_geography_foundation";

if (process.env.KCCC_ALLOW_SCHEMA_MIGRATION !== "1") {
  console.error("BLOCKED: Set KCCC_ALLOW_SCHEMA_MIGRATION=1");
  process.exit(1);
}

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL) process.env.DATABASE_URL = loaded.DATABASE_URL;
if (loaded.DIRECT_URL) process.env.DIRECT_URL = loaded.DIRECT_URL;

const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const p = new PrismaClient();
const sql = readFileSync(
  path.join(root, "prisma/migrations", MIGRATION, "migration.sql"),
  "utf8",
);
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  try {
    await p.$executeRawUnsafe(statement);
    console.log("OK:", statement.slice(0, 88).replace(/\s+/g, " "));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /duplicate/i.test(msg)) {
      console.log("Skip:", statement.slice(0, 90));
      continue;
    }
    throw err;
  }
}

const existing = await p.$queryRawUnsafe(`
  SELECT migration_name FROM kelly_calendar._prisma_migrations
  WHERE migration_name = '${MIGRATION}'
`);
if (!Array.isArray(existing) || existing.length === 0) {
  await p.$executeRawUnsafe(`
    INSERT INTO kelly_calendar._prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES
      (gen_random_uuid()::text, 'ic01-manual', NOW(), '${MIGRATION}', NULL, NULL, NOW(), 1)
  `);
  console.log("Recorded migration in _prisma_migrations");
} else {
  console.log("Migration already recorded");
}

await p.$disconnect();
