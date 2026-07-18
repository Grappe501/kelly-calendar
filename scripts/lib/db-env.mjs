import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Load kelly-calendar then allowlisted RedDirt fallback for DATABASE_URL only. */
export function loadDatabaseEnv() {
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));
  if (!process.env.DATABASE_URL) {
    const redDirt = path.resolve(root, "..", "RedDirt");
    loadEnvFile(path.join(redDirt, ".env.local"));
    loadEnvFile(path.join(redDirt, ".env"));
  }
  return {
    databaseUrl: process.env.DATABASE_URL || null,
    directUrl: process.env.DIRECT_URL || null,
    root,
  };
}

export function classifyTarget(databaseUrl) {
  if (!databaseUrl) return { class: "missing", hosted: false };
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname;
    const hosted =
      host.includes("supabase") ||
      host.includes("neon") ||
      host.includes("amazonaws") ||
      host.includes("azure") ||
      host.includes("rds") ||
      (!host.includes("localhost") && host !== "127.0.0.1");
    return {
      class: hosted ? "hosted postgresql" : "local postgresql",
      hosted,
      hostnameRedacted: host.replace(/^[^.]+/, "***"),
    };
  } catch {
    return { class: "unparseable", hosted: false };
  }
}

export async function withClient(fn) {
  const { databaseUrl } = loadDatabaseEnv();
  if (!databaseUrl) throw new Error("DATABASE_URL missing");
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export { root };
