/**
 * Apply D15 exception digest + external reference SQL when migrate deploy history is diverged.
 * Gate: KCCC_ALLOW_SCHEMA_MIGRATION=1
 * Additive / non-destructive. Creates zero fabricated digest or sync rows.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const sqlPath = path.join(
  root,
  "prisma/migrations/20260720150000_v21_campaign_day_exception_digest/migration.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  try {
    await p.$executeRawUnsafe(statement);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /duplicate/i.test(msg)) {
      console.log("Skip:", statement.slice(0, 80));
      continue;
    }
    throw err;
  }
}
console.log(`Exception digest SQL applied (${statements.length} statements).`);

const existing = await p.$queryRawUnsafe(`
  SELECT migration_name FROM kelly_calendar._prisma_migrations
  WHERE migration_name = '20260720150000_v21_campaign_day_exception_digest'
`);
if (existing.length === 0) {
  await p.$executeRawUnsafe(`
    INSERT INTO kelly_calendar._prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES
      (gen_random_uuid()::text, 'manual-d15-exception-digest', NOW(), '20260720150000_v21_campaign_day_exception_digest', NULL, NULL, NOW(), 1)
  `);
  console.log("Recorded migration history row.");
} else {
  console.log("Migration history row already present.");
}

await p.$disconnect();
