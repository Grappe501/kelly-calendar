import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/load-env-files.mjs";

const secretPatterns = [
  /sk-[a-zA-Z0-9]{20,}/,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/i,
];

const trackedCandidates = [
  ".env.example",
  "README.md",
  "netlify.toml",
  "package.json",
  "docs/ENVIRONMENT_PROTOCOL.md",
  "develop_notes/KCCC_STEP_02_IMPLEMENTATION_REPORT.md",
];

let failed = false;

for (const forbidden of [".env", ".env.local"]) {
  // Existence is OK locally; must not be tracked. Presence check only for content scan skip.
  const full = path.join(repoRoot, forbidden);
  if (fs.existsSync(full)) {
    console.log(`INFO: ${forbidden} exists locally (must remain gitignored)`);
  }
}

for (const rel of trackedCandidates) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) {
      console.error(`FAIL: possible secret material in ${rel}`);
      failed = true;
    }
  }
}

const example = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
for (const key of [
  "DATABASE_URL=",
  "OPENAI_API_KEY=",
  "NEXT_PUBLIC_ELECTION_DATE=2026-11-03",
  "NEXT_PUBLIC_CAMPAIGN_TIMEZONE=America/Chicago",
]) {
  if (!example.includes(key)) {
    console.error(`FAIL: .env.example missing ${key}`);
    failed = true;
  }
}

if (example.match(/OPENAI_API_KEY=\S+/)) {
  console.error("FAIL: .env.example appears to contain an OPENAI_API_KEY value");
  failed = true;
} else {
  console.log("PASS: .env.example keeps secrets empty");
}

if (failed) process.exit(1);
console.log("Environment safety validation passed.");
