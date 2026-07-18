import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "prisma/migrations");

const FORBIDDEN = [
  { re: /\bDROP\s+DATABASE\b/i, reason: "DROP DATABASE" },
  { re: /\bDROP\s+SCHEMA\s+(IF\s+EXISTS\s+)?("?public"?|auth|extensions)/i, reason: "DROP non-owned schema" },
  { re: /\bDROP\s+SCHEMA\s+(IF\s+EXISTS\s+)?"?kelly_calendar"?\s+CASCADE/i, reason: "DROP kelly_calendar CASCADE" },
  { re: /\bTRUNCATE\b/i, reason: "TRUNCATE" },
  { re: /\bCREATE\s+TABLE\s+"?public"?\./i, reason: "CREATE TABLE public" },
  { re: /\bALTER\s+TABLE\s+"?public"?\./i, reason: "ALTER TABLE public" },
  { re: /\bDROP\s+TABLE\s+"?public"?\./i, reason: "DROP TABLE public" },
  { re: /\bDELETE\s+FROM\s+"?public"?\./i, reason: "DELETE FROM public" },
  { re: /\bUPDATE\s+"?public"?\./i, reason: "UPDATE public" },
  { re: /\bALTER\s+TABLE\s+"(?!kelly_calendar)[^"]+"\./i, reason: "ALTER non-kelly schema table" },
  { re: /\bDROP\s+TABLE\s+"(?!kelly_calendar)[^"]+"\./i, reason: "DROP non-kelly schema table" },
];

let failed = false;
const dirs = fs
  .readdirSync(migrationsDir)
  .filter((n) => fs.statSync(path.join(migrationsDir, n)).isDirectory())
  .sort();

for (const dir of dirs) {
  const sqlPath = path.join(migrationsDir, dir, "migration.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  // Strip SQL comments for scanning
  const stripped = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  for (const rule of FORBIDDEN) {
    if (rule.re.test(stripped)) {
      console.error(`FAIL: ${dir} — ${rule.reason}`);
      failed = true;
    }
  }

  // Owned CREATE TABLE must be kelly_calendar-qualified
  const creates = [...stripped.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/gi)];
  for (const m of creates) {
    const name = m[1].replace(/"/g, "");
    if (!name.startsWith("kelly_calendar.")) {
      console.error(`FAIL: ${dir} — unqualified/non-owned CREATE TABLE: ${name}`);
      failed = true;
    }
  }

  console.log(`PASS: scanned ${dir}`);
}

if (failed) {
  console.error("Forbidden SQL scan FAILED.");
  process.exit(1);
}
console.log("Forbidden SQL scan passed.");
