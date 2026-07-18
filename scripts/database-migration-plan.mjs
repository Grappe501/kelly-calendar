import fs from "node:fs";
import path from "node:path";
import { root } from "./lib/db-env.mjs";

const migrationsDir = path.join(root, "prisma/migrations");
const dirs = fs
  .readdirSync(migrationsDir)
  .filter((n) => fs.statSync(path.join(migrationsDir, n)).isDirectory())
  .sort();

const plan = [];
for (const dir of dirs) {
  const sqlPath = path.join(migrationsDir, dir, "migration.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  plan.push({
    name: dir,
    bytes: Buffer.byteLength(sql),
    createsSchema: /CREATE SCHEMA/i.test(sql),
    createsPublicTable: /CREATE TABLE\s+"?public"?\./i.test(sql),
    dropPublic: /DROP\s+(TABLE|SCHEMA)\s+"?public"?/i.test(sql),
    tableCreates: (sql.match(/CREATE TABLE\s+"kelly_calendar"\./gi) || []).length,
    enumCreates: (sql.match(/CREATE TYPE\s+"kelly_calendar"\./gi) || []).length,
  });
}

const out = {
  generatedAt: new Date().toISOString(),
  migrations: plan,
  applyCommand: "npm run db:migration:apply",
  note: "Inspect SQL before apply. Mutations remain disabled without Step 4 auth.",
};

fs.mkdirSync(path.join(root, "develop_notes/database_proofs"), { recursive: true });
fs.writeFileSync(
  path.join(root, "develop_notes/database_proofs/migration-plan-latest.json"),
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
if (plan.some((m) => m.createsPublicTable || m.dropPublic)) process.exit(1);
