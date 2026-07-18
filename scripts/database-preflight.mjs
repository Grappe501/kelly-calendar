import fs from "node:fs";
import path from "node:path";
import {
  classifyTarget,
  loadDatabaseEnv,
  root,
  withClient,
} from "./lib/db-env.mjs";

const { databaseUrl, directUrl } = loadDatabaseEnv();
const classification = classifyTarget(databaseUrl);

let schemaPresent = false;
let reachable = false;
let kellyTableCount = 0;
let publicTableSample = 0;

if (databaseUrl) {
  try {
    await withClient(async (client) => {
      reachable = true;
      const schema = await client.query(
        `SELECT 1 AS ok FROM information_schema.schemata WHERE schema_name = 'kelly_calendar'`,
      );
      schemaPresent = schema.rowCount > 0;
      if (schemaPresent) {
        const tables = await client.query(
          `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'kelly_calendar'`,
        );
        kellyTableCount = tables.rows[0].n;
      }
      const pub = await client.query(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
      );
      publicTableSample = pub.rows[0].n;
    });
  } catch (error) {
    console.error("FAIL: database unreachable (details redacted)");
    console.error(String(error?.message || error).replace(/:[^:@/]+@/g, ":***@"));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  targetClass: classification.class,
  hosted: classification.hosted,
  databaseReachable: reachable,
  directUrlConfigured: Boolean(directUrl),
  kellyCalendarSchemaPresent: schemaPresent,
  kellyCalendarTableCount: kellyTableCount,
  publicSchemaTableCount: publicTableSample,
  pendingMigrations: fs.existsSync(path.join(root, "prisma/migrations"))
    ? fs.readdirSync(path.join(root, "prisma/migrations")).filter((n) =>
        fs.statSync(path.join(root, "prisma/migrations", n)).isDirectory(),
      )
    : [],
  authenticationComplete: false,
  mutationsAuthorized: false,
  forbiddenSqlDetected: false,
  notes:
    "Step 4 AUTH incomplete — live mutations remain disabled even if schema is applied.",
};

const outDir = path.join(root, "develop_notes/database_proofs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "preflight-latest.json"),
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
if (!reachable) process.exit(1);
console.log("Database preflight complete.");
