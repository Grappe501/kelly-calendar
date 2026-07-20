/**
 * Apply only D9 closeout SQL when migrate deploy history is diverged.
 * Gate: KCCC_ALLOW_SCHEMA_MIGRATION=1
 * Additive / non-destructive. Creates zero fabricated closeout rows.
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
  "prisma/migrations/20260720090000_v21_campaign_day_closeout/migration.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const beforeClose = await p.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS c
  FROM information_schema.tables
  WHERE table_schema = 'kelly_calendar' AND table_name = 'CampaignDayCloseout'
`);
console.log("CampaignDayCloseout table present before:", beforeClose[0]?.c > 0);

const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0);

for (const statement of statements) {
  await p.$executeRawUnsafe(statement);
}
console.log(`Closeout SQL applied (${statements.length} statements).`);

// Record migration if missing
const existing = await p.$queryRawUnsafe(`
  SELECT migration_name FROM kelly_calendar._prisma_migrations
  WHERE migration_name = '20260720090000_v21_campaign_day_closeout'
`);
if (existing.length === 0) {
  await p.$executeRawUnsafe(`
    INSERT INTO kelly_calendar._prisma_migrations
      (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES
      (gen_random_uuid()::text, 'manual-d9-closeout', NOW(), '20260720090000_v21_campaign_day_closeout', NULL, NULL, NOW(), 1)
  `);
  console.log("Recorded migration history row.");
} else {
  console.log("Migration history row already present.");
}

const closeouts = await p.campaignDayCloseout.count();
const carry = await p.campaignDayCarryForwardItem.count();
console.log("closeout rows after:", closeouts);
console.log("carry-forward rows after:", carry);
console.log("fabricated closeouts:", closeouts);
console.log("fabricated carry-forwards:", carry);

await p.$disconnect();
