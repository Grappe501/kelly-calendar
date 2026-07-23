/**
 * Apply IC-02 RedDirt read integration SQL when migrate deploy is blocked
 * by an unrelated failed migration in history.
 * Gate: KCCC_ALLOW_SCHEMA_MIGRATION=1
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
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const p = new PrismaClient();
const migrationName = "20260723140000_ic02_reddirt_read_integration";
const sql = readFileSync(
  path.join(root, `prisma/migrations/${migrationName}/migration.sql`),
  "utf8",
);
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0);
for (const statement of statements) {
  try {
    await p.$executeRawUnsafe(statement);
    console.log("OK:", statement.slice(0, 90).replace(/\n/g, " "));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg) || /duplicate/i.test(msg)) {
      console.log("Skip:", statement.slice(0, 90).replace(/\n/g, " "));
      continue;
    }
    throw err;
  }
}
console.log(`IC-02 SQL applied (${statements.length} statements).`);
const existing = await p.$queryRawUnsafe(`
  SELECT migration_name FROM kelly_calendar._prisma_migrations
  WHERE migration_name = '${migrationName}'
`);
if (existing.length === 0) {
  await p.$executeRawUnsafe(`
    INSERT INTO kelly_calendar._prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES
      (gen_random_uuid()::text, 'manual-ic02', NOW(), '${migrationName}', NULL, NULL, NOW(), 1)
  `);
  console.log("Recorded migration", migrationName);
} else {
  console.log("Migration already recorded");
}
await p.$disconnect();
