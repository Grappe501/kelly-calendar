import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadApprovedEnv } from "./lib/load-env-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const forbiddenPublic = [
  "NEXT_PUBLIC_DATABASE_URL",
  "NEXT_PUBLIC_OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_DIRECT_URL",
];

const example = fs.readFileSync(path.join(repoRoot, ".env.example"), "utf8");
for (const key of forbiddenPublic) {
  if (example.includes(`${key}=`)) fail(`.env.example must not define ${key}`);
}
pass("No forbidden NEXT_PUBLIC secret keys in .env.example");

const { env } = loadApprovedEnv({ includeRedDirtFallback: true });
const timezone = env.NEXT_PUBLIC_CAMPAIGN_TIMEZONE ?? "America/Chicago";
const election = env.NEXT_PUBLIC_ELECTION_DATE ?? "2026-11-03";
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

try {
  Intl.DateTimeFormat(undefined, { timeZone: timezone });
  pass(`Timezone valid: ${timezone}`);
} catch {
  fail(`Invalid timezone: ${timezone}`);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(election)) fail(`Invalid election date: ${election}`);
else pass(`Election date format valid: ${election}`);

try {
  // eslint-disable-next-line no-new
  new URL(appUrl);
  pass("App URL parseable");
} catch {
  fail("App URL invalid");
}

for (const key of forbiddenPublic) {
  if (env[key]) fail(`${key} is set — forbidden`);
}

if (failed) process.exit(1);
console.log("Environment validation passed.");
