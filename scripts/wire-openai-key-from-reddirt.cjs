/**
 * Presence-only transfer of OPENAI_API_KEY from RedDirt .env → Kelly .env.local.
 * Never prints the secret value.
 */
const fs = require("node:fs");
const path = require("node:path");

const redDirtEnv = path.resolve(__dirname, "..", "..", "RedDirt", ".env");
const kellyEnv = path.resolve(__dirname, "..", ".env.local");

function readKey(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^OPENAI_API_KEY\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v.length ? v : null;
  }
  return null;
}

const key = readKey(redDirtEnv);
if (!key) {
  console.log("OPENAI_API_KEY ........ ABSENT");
  process.exit(1);
}

let existing = fs.existsSync(kellyEnv) ? fs.readFileSync(kellyEnv, "utf8") : "";
if (/^OPENAI_API_KEY\s*=/m.test(existing)) {
  existing = existing.replace(/^OPENAI_API_KEY\s*=.*$/m, `OPENAI_API_KEY=${key}`);
} else {
  if (existing && !existing.endsWith("\n")) existing += "\n";
  existing += `OPENAI_API_KEY=${key}\n`;
}
fs.writeFileSync(kellyEnv, existing, "utf8");

const check = readKey(kellyEnv);
console.log(check ? "OPENAI_API_KEY ........ PRESENT" : "OPENAI_API_KEY ........ FAIL");
process.exit(check ? 0 : 1);
