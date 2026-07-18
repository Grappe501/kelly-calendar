import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { root, withClient } from "./lib/db-env.mjs";

const label = process.argv[2] || "before";

await withClient(async (client) => {
  const schemas = await client.query(
    `SELECT schema_name FROM information_schema.schemata
     WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
     ORDER BY schema_name`,
  );
  const tables = await client.query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema','pg_toast','kelly_calendar')
     ORDER BY table_schema, table_name`,
  );
  const columns = await client.query(
    `SELECT table_schema, table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema NOT IN ('pg_catalog','information_schema','pg_toast','kelly_calendar')
     ORDER BY table_schema, table_name, ordinal_position`,
  );

  const payload = {
    label,
    capturedAt: new Date().toISOString(),
    schemas: schemas.rows.map((r) => r.schema_name),
    tables: tables.rows,
    columnSignature: createHash("sha256")
      .update(JSON.stringify(columns.rows))
      .digest("hex"),
    tableCount: tables.rowCount,
    columnCount: columns.rowCount,
  };

  const outDir = path.join(root, "develop_notes/database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `reddirt-structure-${label}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${path.relative(root, file)}`);
  console.log(`Non-kelly tables: ${payload.tableCount}`);
  console.log(`Column signature: ${payload.columnSignature}`);
});
