/**
 * Ensures kelly-calendar/.env.local has APP_SESSION_SECRET (32+ chars).
 * Never prints the secret. Creates .env.local if missing.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");

function hasSessionSecret(text) {
  const m = text.match(/^APP_SESSION_SECRET=(.+)$/m);
  if (!m) return false;
  const value = m[1].trim().replace(/^["']|["']$/g, "");
  return value.length >= 32;
}

let existing = "";
if (fs.existsSync(envLocal)) {
  existing = fs.readFileSync(envLocal, "utf8");
  if (hasSessionSecret(existing)) {
    console.log("PASS: APP_SESSION_SECRET already present in .env.local");
    process.exit(0);
  }
}

const secret = crypto.randomBytes(48).toString("base64url");
const line = `APP_SESSION_SECRET=${secret}\n`;
if (existing && !existing.endsWith("\n")) existing += "\n";
fs.writeFileSync(envLocal, `${existing}${line}`, "utf8");
console.log("PASS: wrote APP_SESSION_SECRET to .env.local (value not printed)");
