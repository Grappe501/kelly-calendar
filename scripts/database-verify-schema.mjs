import { withClient } from "./lib/db-env.mjs";

await withClient(async (client) => {
  const schema = await client.query(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'kelly_calendar'`,
  );
  if (!schema.rowCount) {
    console.error("FAIL: kelly_calendar schema missing");
    process.exit(1);
  }
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'kelly_calendar' ORDER BY table_name`,
  );
  const publicKelly = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('Event','Calendar','CalendarGroup')`,
  );
  console.log(`PASS: kelly_calendar tables: ${tables.rowCount}`);
  for (const row of tables.rows) console.log(`  - ${row.table_name}`);
  if (publicKelly.rowCount) {
    console.error("FAIL: Kelly-like tables found in public");
    process.exit(1);
  }
  console.log("PASS: no Kelly tables in public");
});
