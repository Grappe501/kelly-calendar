/**
 * Generate a cryptographically strong APP_SESSION_SECRET for the operator
 * to place in Netlify. Never prints the secret. Never writes tracked files.
 *
 * Destination (gitignored / outside report):
 *   H:/SOSWebsite/.local/operator-secrets/kccc-app-session-secret.txt
 *
 * Or set KCCC_SECRET_OUT to an absolute path under operator control.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOut = path.join(
  "H:",
  "SOSWebsite",
  ".local",
  "operator-secrets",
  "kccc-app-session-secret.txt",
);
const outPath = process.env.KCCC_SECRET_OUT?.trim() || defaultOut;

// Refuse writing into the git worktree tracked paths
const resolvedOut = path.resolve(outPath);
const resolvedRoot = path.resolve(root);
if (
  resolvedOut.startsWith(resolvedRoot + path.sep) &&
  !resolvedOut.includes(`${path.sep}.local${path.sep}`)
) {
  console.error("REFUSED: will not write production secret into tracked project paths");
  process.exit(1);
}

const secret = crypto.randomBytes(48).toString("base64url");
fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
fs.writeFileSync(resolvedOut, `${secret}\n`, { encoding: "utf8", mode: 0o600 });

console.log("PASS: production session secret generated");
console.log(`length: ${secret.length}`);
console.log(`written: ${resolvedOut}`);
console.log("ACTION: paste into Netlify site env as APP_SESSION_SECRET (runtime scopes)");
console.log("Never commit this file. Value not printed.");
