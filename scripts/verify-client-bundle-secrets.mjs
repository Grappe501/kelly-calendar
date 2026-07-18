import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = path.join(repoRoot, ".next", "static");

const patterns = [
  { category: "OPENAI_API_KEY_NAME", re: /OPENAI_API_KEY/ },
  { category: "DATABASE_URL_NAME", re: /DATABASE_URL/ },
  { category: "DIRECT_URL_NAME", re: /DIRECT_URL/ },
  { category: "SERVICE_ROLE_NAME", re: /SUPABASE_SERVICE_ROLE_KEY/ },
  { category: "SESSION_SECRET_NAME", re: /APP_SESSION_SECRET/ },
  { category: "INTERNAL_SECRET_NAME", re: /INTERNAL_API_SECRET/ },
  { category: "POSTGRES_URL", re: /postgres(?:ql)?:\/\/[^\s"']+/i },
  { category: "BEARER_TOKEN", re: /Bearer\s+[A-Za-z0-9._\-]{12,}/ },
  { category: "OPENAI_KEY_VALUE", re: /sk-[A-Za-z0-9]{20,}/ },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|css|html|txt|map)$/.test(entry.name)) files.push(full);
  }
  return files;
}

if (!fs.existsSync(staticDir)) {
  console.error("FAIL: .next/static missing — run npm run build first");
  process.exit(1);
}

let failed = false;
const files = walk(staticDir);
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.re.test(text)) {
      console.error(
        `FAIL: ${pattern.category} in ${path.relative(repoRoot, file).replaceAll("\\", "/")}`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`PASS: scanned ${files.length} client assets under .next/static — no secret patterns`);
