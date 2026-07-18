import fs from "node:fs";
import path from "node:path";
import { root, withClient } from "./lib/db-env.mjs";

const forbidden = [];
const schemaPath = path.join(root, "prisma/schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes('schemas   = ["kelly_calendar"]')) {
  forbidden.push("datasource must declare schemas = [kelly_calendar]");
}
if (!/@@schema\("kelly_calendar"\)/.test(schema)) {
  forbidden.push("models must use @@schema(kelly_calendar)");
}
if (/@@schema\("public"\)/.test(schema)) {
  forbidden.push("public schema models are forbidden");
}

const migrationDirs = fs.existsSync(path.join(root, "prisma/migrations"))
  ? fs.readdirSync(path.join(root, "prisma/migrations"))
  : [];

for (const dir of migrationDirs) {
  const sqlPath = path.join(root, "prisma/migrations", dir, "migration.sql");
  if (!fs.existsSync(sqlPath)) continue;
  const sql = fs.readFileSync(sqlPath, "utf8");
  const upper = sql.toUpperCase();
  for (const pattern of [
    "DROP SCHEMA PUBLIC",
    "DROP TABLE PUBLIC",
    "ALTER TABLE PUBLIC",
    "TRUNCATE ",
    "DROP DATABASE",
  ]) {
    if (upper.includes(pattern)) forbidden.push(`${dir}: contains ${pattern}`);
  }
  // Allow CREATE SCHEMA kelly_calendar and kelly_calendar.* only for app objects
  if (/CREATE TABLE\s+"?public"?\./i.test(sql)) {
    forbidden.push(`${dir}: creates table in public`);
  }
}

let livePublicKelly = 0;
try {
  await withClient(async (client) => {
    const r = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name LIKE 'Event%'`,
    );
    livePublicKelly = r.rows[0].n;
  });
} catch {
  // ignore connectivity here; preflight owns that
}

const report = {
  generatedAt: new Date().toISOString(),
  forbiddenFindings: forbidden,
  livePublicKellyLikeTables: livePublicKelly,
  ok: forbidden.length === 0,
};

fs.mkdirSync(path.join(root, "develop_notes/database_proofs"), { recursive: true });
fs.writeFileSync(
  path.join(root, "develop_notes/database_proofs/namespace-audit-latest.json"),
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
console.log("Namespace audit passed.");
