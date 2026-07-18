/**
 * Scan tracked files for likely secret material. Never prints secret values.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const patterns = [
  { name: "postgres_url", re: /postgres(?:ql)?:\/\/[^\s"']+/i },
  { name: "prisma_url", re: /prisma\+postgres:\/\/[^\s"']+/i },
  { name: "session_cookie_raw", re: /kccc_session=[A-Za-z0-9._-]{20,}/ },
  { name: "private_key_block", re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  {
    name: "assigned_session_secret",
    re: /APP_SESSION_SECRET\s*=\s*["']?[A-Za-z0-9+/=_-]{32,}/,
  },
  {
    name: "seed_password_assignment",
    re: /KCCC_SEED_PASSWORD\s*=\s*["']?[^\s"']{8,}/,
  },
];

const allowlistedPaths = new Set([
  "scripts/secret-scan.mjs",
  "scripts/validate-netlify-auth-env.mjs",
  "scripts/validate-production-fail-closed.mjs",
  "scripts/validate-production-auth-env.mjs",
  "src/lib/auth/session-secret-policy.ts",
  "scripts/seed-auth-users.mjs",
]);

function isAllowlisted(rel) {
  const norm = rel.replace(/\\/g, "/");
  if (allowlistedPaths.has(norm)) return true;
  // Unit tests intentionally use fixture secrets / redaction samples.
  if (norm.startsWith("tests/")) return true;
  return false;
}

let files;
try {
  files = execSync("git ls-files", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
} catch {
  console.error("FAIL: unable to list tracked files");
  process.exit(1);
}

let failed = 0;
for (const rel of files) {
  if (isAllowlisted(rel)) continue;
  if (rel.includes("node_modules") || rel.endsWith(".png") || rel.endsWith(".jpg")) {
    continue;
  }
  const full = path.join(root, rel);
  let text;
  try {
    text = fs.readFileSync(full, "utf8");
  } catch {
    continue;
  }
  if (text.length > 2_000_000) continue;
  for (const { name, re } of patterns) {
    if (re.test(text)) {
      console.error(`FAIL: ${name} pattern in ${rel}`);
      failed += 1;
    }
  }
}

if (failed) {
  console.error(`Secret scan failed (${failed} hits). Values not printed.`);
  process.exit(1);
}
console.log(`PASS: secret scan clean (${files.length} tracked files)`);
