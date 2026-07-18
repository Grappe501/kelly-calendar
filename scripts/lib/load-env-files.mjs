import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..", "..");
export const workspaceRoot = path.resolve(repoRoot, "..");

/**
 * Minimal .env parser — does not print values.
 */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function assignFromFile(target, filePath, found) {
  if (!fs.existsSync(filePath)) return;
  found.push(path.relative(workspaceRoot, filePath).replaceAll("\\", "/"));
  Object.assign(target, parseEnvFile(filePath));
}

/**
 * Load order (lowest → highest precedence among files):
 * RedDirt/.env → RedDirt/.env.local → kelly-calendar/.env → kelly-calendar/.env.local
 * Then non-empty process.env wins (CI / shell).
 */
export function loadApprovedEnv({ includeRedDirtFallback = true } = {}) {
  const fileLayer = {};
  const found = [];

  if (includeRedDirtFallback) {
    assignFromFile(fileLayer, path.join(workspaceRoot, "RedDirt", ".env"), found);
    assignFromFile(fileLayer, path.join(workspaceRoot, "RedDirt", ".env.local"), found);
  }
  assignFromFile(fileLayer, path.join(repoRoot, ".env"), found);
  assignFromFile(fileLayer, path.join(repoRoot, ".env.local"), found);

  const merged = { ...fileLayer };
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== "") {
      merged[key] = value;
    }
  }

  return { env: merged, foundFiles: found };
}

export function classifyDatabaseTarget(databaseUrl) {
  if (!databaseUrl?.trim()) {
    return { present: false, targetType: "missing" };
  }
  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:/i, "http:");
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return { present: true, targetType: "local_loopback" };
    }
    if (host.includes(".")) {
      return { present: true, targetType: "hosted_postgresql" };
    }
    return { present: true, targetType: "unknown" };
  } catch {
    return { present: true, targetType: "unknown" };
  }
}
