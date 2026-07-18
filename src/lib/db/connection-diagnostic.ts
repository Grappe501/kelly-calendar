import "server-only";

import pg from "pg";
import { classifyDatabaseTarget, classifySslMode } from "@/lib/db/database-target";
import { getServerEnvironment } from "@/lib/env/server-environment";

export type ConnectionDiagnostic = {
  configured: boolean;
  connectionTested: boolean;
  connectionSucceeded: boolean;
  targetClass: ReturnType<typeof classifyDatabaseTarget>;
  sslModeClass: string;
  directUrlConfigured: boolean;
  mutationAttempted: false;
  migrationAttempted: false;
  activeSchema?: string;
  timestamp: string;
  errorCode?: string;
};

export async function runConnectionDiagnostic(): Promise<ConnectionDiagnostic> {
  const server = getServerEnvironment();
  const targetClass = classifyDatabaseTarget(server.databaseUrl);
  const base: ConnectionDiagnostic = {
    configured: Boolean(server.databaseUrl),
    connectionTested: false,
    connectionSucceeded: false,
    targetClass,
    sslModeClass: classifySslMode(server.databaseUrl),
    directUrlConfigured: Boolean(server.directUrl),
    mutationAttempted: false,
    migrationAttempted: false,
    timestamp: new Date().toISOString(),
  };

  if (!server.databaseUrl || targetClass === "missing" || targetClass === "invalid") {
    return base;
  }

  const client = new pg.Client({
    connectionString: server.databaseUrl,
    connectionTimeoutMillis: 8_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
  });

  try {
    await client.connect();
    const ping = await client.query("SELECT 1 AS connection_ok");
    const ok = ping.rows?.[0]?.connection_ok === 1;
    let activeSchema: string | undefined;
    try {
      const schema = await client.query("SELECT current_schema() AS active_schema");
      activeSchema = String(schema.rows?.[0]?.active_schema ?? "");
    } catch {
      activeSchema = undefined;
    }
    return {
      ...base,
      connectionTested: true,
      connectionSucceeded: ok,
      activeSchema,
    };
  } catch (error) {
    return {
      ...base,
      connectionTested: true,
      connectionSucceeded: false,
      errorCode:
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "unknown")
          : "unknown",
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
