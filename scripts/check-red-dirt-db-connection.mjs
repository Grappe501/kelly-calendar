import pg from "pg";
import {
  classifyDatabaseTarget,
  loadApprovedEnv,
} from "./lib/load-env-files.mjs";

const { env, foundFiles } = loadApprovedEnv({ includeRedDirtFallback: true });
const databaseUrl = env.DATABASE_URL;
const classification = classifyDatabaseTarget(databaseUrl);

console.log("Kelly Calendar Database Diagnostic");
console.log("");
console.log(`Env files considered (names only): ${foundFiles.length ? foundFiles.join(", ") : "none"}`);
console.log(`DATABASE_URL: ${classification.present ? "present" : "missing"}`);
console.log(`Target type: ${classification.targetType.replaceAll("_", " ")}`);
console.log("Mutation attempted: no");
console.log("Migration attempted: no");

if (!classification.present) {
  console.log("Connection test: NOT RUN");
  console.log("Step 3 will complete environment configuration.");
  process.exit(0);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 8_000,
  query_timeout: 8_000,
  statement_timeout: 8_000,
});

try {
  await client.connect();
  const result = await client.query("SELECT 1 AS connection_ok");
  const ok = result.rows?.[0]?.connection_ok === 1;
  if (!ok) {
    throw new Error("Unexpected SELECT 1 result");
  }
  console.log("Connection test: PASS");
  process.exit(0);
} catch (error) {
  console.error("Connection test: FAIL");
  console.error(`Reason class: ${error?.code ?? error?.name ?? "unknown"}`);
  process.exit(1);
} finally {
  try {
    await client.end();
  } catch {
    // ignore
  }
}
