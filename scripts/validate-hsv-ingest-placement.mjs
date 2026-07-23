/**
 * HSV ingest source placement validator + optional idempotent content align.
 *
 * Static: proves observation-pass + pass3 map lodging-gate / host-ops / travel
 * to the correct ingest keys (resolved in DB to KCCC-2026-0040 / 0039 / 0025).
 *
 * DB (via established env loader): verifies placement markers; never prints secrets.
 *
 * Usage:
 *   npm run calendar:hsv-placement:validate
 *   node scripts/run-with-h-drive-env.cjs node scripts/validate-hsv-ingest-placement.mjs --dry-run
 *   node scripts/run-with-h-drive-env.cjs node scripts/validate-hsv-ingest-placement.mjs --apply
 *
 * tmp-hsv-verify.mjs is NOT valid evidence (failed without DATABASE_URL).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run") || !argv.includes("--apply");
const apply = argv.includes("--apply");

const CANONICAL = {
  lodging: {
    ingestKey: "lodging-hsv-host-2026-07-22",
    eventNumber: "KCCC-2026-0040",
    sourceFile: "scripts/ingest-observation-pass.mjs",
    required: ["GATE ACCESS", "DEBORAH BRYAN", "Kelly Grappe", "2026-07-22"],
    forbidden: ["Road to Victory Cake", "Social hour: 3", "Speeches: ~4:15"],
  },
  speaking: {
    ingestKey: "hsv-dems-road-to-blue-2026-07-23",
    eventNumber: "KCCC-2026-0039",
    sourceFile: "scripts/ingest-observation-pass.mjs",
    required: ["Road to Victory Cake", "Deb Bryan", "Reserved seating", "4:15"],
    forbidden: ["GATE ACCESS:", "Sponsored by: DEBORAH BRYAN", "Authorized visit days"],
  },
  travel: {
    ingestKey: "travel-hsv-2026-07-22",
    eventNumber: "KCCC-2026-0025",
    sourceFile: "scripts/ingest-operator-pass3.mjs",
    required: ["GATE:", "KCCC-2026-0040", "DEBORAH BRYAN"],
    forbidden: ["Road to Victory Cake", "GATE ACCESS:", "Authorized visit days"],
  },
};

let failed = 0;
let passed = 0;
function pass(msg) {
  console.log("PASS:", msg);
  passed += 1;
}
function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}

function extractKeyBlock(src, key) {
  const needle = `key: "${key}"`;
  const idx = src.indexOf(needle);
  if (idx < 0) return null;
  const next = src.indexOf("\n  {\n    key:", idx + needle.length);
  return next < 0 ? src.slice(idx) : src.slice(idx, next);
}

function fingerprintNotes(text) {
  return createHash("sha256").update(text || "").digest("hex").slice(0, 16);
}

// ── Static source validation ─────────────────────────────────────────
if (fs.existsSync(path.join(root, "scripts/tmp-hsv-verify.mjs"))) {
  fail("tmp-hsv-verify.mjs must remain absent (invalid evidence path)");
} else {
  pass("tmp-hsv-verify.mjs absent");
}

for (const [role, spec] of Object.entries(CANONICAL)) {
  const abs = path.join(root, spec.sourceFile);
  const src = fs.readFileSync(abs, "utf8");
  const block = extractKeyBlock(src, spec.ingestKey);
  if (!block) {
    fail(`${role}: missing key ${spec.ingestKey} in ${spec.sourceFile}`);
    continue;
  }
  pass(`${role}: key ${spec.ingestKey} present in ${spec.sourceFile}`);
  for (const token of spec.required) {
    if (block.includes(token)) pass(`${role} source has "${token}"`);
    else fail(`${role} source missing "${token}"`);
  }
  for (const token of spec.forbidden) {
    if (block.includes(token)) fail(`${role} source must not contain "${token}"`);
    else pass(`${role} source free of "${token}"`);
  }
}

// Cross-contamination: lodging key must not appear inside speaking block as content dump
{
  const obs = fs.readFileSync(path.join(root, "scripts/ingest-observation-pass.mjs"), "utf8");
  const speaking = extractKeyBlock(obs, CANONICAL.speaking.ingestKey) || "";
  const lodging = extractKeyBlock(obs, CANONICAL.lodging.ingestKey) || "";
  if (speaking.includes("GATE ACCESS:")) fail("speaking block contains lodging GATE ACCESS");
  else pass("speaking block does not contain GATE ACCESS");
  if (lodging.includes("Road to Victory Cake")) fail("lodging block contains meeting cake text");
  else pass("lodging block does not contain meeting cake text");
}

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (loaded[key] && !process.env[key]) process.env[key] = loaded[key];
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL unavailable via established loader — DB verification gap");
  console.log(`\nHSV placement validate (static only): ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { archivedAt: null, privateNotes: { startsWith: `[ingestKey:${key}]` } },
    select: {
      id: true,
      eventNumber: true,
      campaignDisplayTitle: true,
      privateNotes: true,
      status: true,
      startsAt: true,
      endsAt: true,
      version: true,
      campaignMission: { select: { id: true } },
    },
  });
}

const beforeCounts = {
  events: await prisma.event.count(),
  missions: await prisma.campaignMission.count(),
};

const examined = [];
const proposed = [];
const noop = [];
const missing = [];
const mismatchedNumber = [];

for (const [role, spec] of Object.entries(CANONICAL)) {
  const row = await findByIngestKey(spec.ingestKey);
  if (!row) {
    missing.push(spec.ingestKey);
    fail(`${role}: Event for ingestKey ${spec.ingestKey} not found`);
    continue;
  }
  examined.push(row.eventNumber);
  if (row.eventNumber !== spec.eventNumber) {
    mismatchedNumber.push({
      role,
      expected: spec.eventNumber,
      actual: row.eventNumber,
    });
    fail(
      `${role}: expected ${spec.eventNumber} for ${spec.ingestKey}, got ${row.eventNumber}`,
    );
    continue;
  }
  pass(`${role}: ${spec.eventNumber} resolves via ingestKey ${spec.ingestKey}`);

  const notes = row.privateNotes || "";
  let needs = false;
  for (const token of spec.required) {
    if (!notes.includes(token)) {
      needs = true;
      fail(`${role} DB ${spec.eventNumber} missing "${token}"`);
    } else {
      pass(`${role} DB ${spec.eventNumber} has "${token}"`);
    }
  }
  for (const token of spec.forbidden) {
    if (notes.includes(token)) {
      needs = true;
      fail(`${role} DB ${spec.eventNumber} must not contain "${token}"`);
    } else {
      pass(`${role} DB ${spec.eventNumber} free of "${token}"`);
    }
  }

  if (needs) proposed.push({ role, eventNumber: row.eventNumber, version: row.version });
  else noop.push(row.eventNumber);
}

if (missing.length === 0) pass("missing targets: 0");
else fail(`missing targets: ${missing.length}`);
if (mismatchedNumber.length === 0) pass("ambiguous/mismatched numbers: 0");
else fail(`mismatched event numbers: ${mismatchedNumber.length}`);

console.log("\n--- dry-run summary ---");
console.log(JSON.stringify({ dryRun, apply, examined, proposed, noop, missing }, null, 2));

if (apply && proposed.length > 0) {
  fail(
    "Apply refused: DB placement markers incomplete — use operator correction script, not blind source overwrite (would wipe richer provenance).",
  );
} else if (apply) {
  pass("Apply: no mutations required (already aligned)");
} else {
  pass("Dry-run: no Event mutations performed");
}

const afterCounts = {
  events: await prisma.event.count(),
  missions: await prisma.campaignMission.count(),
};
if (beforeCounts.events === afterCounts.events) pass("Event delta: 0");
else fail(`Event delta: ${afterCounts.events - beforeCounts.events}`);
if (beforeCounts.missions === afterCounts.missions) pass("Mission delta: 0");
else fail(`Mission delta: ${afterCounts.missions - beforeCounts.missions}`);

const proof = {
  pass: "HSV-INGEST-SOURCE-ALIGNMENT-2026-07-22",
  at: new Date().toISOString(),
  dryRun,
  apply,
  examined,
  proposed,
  noop,
  missing,
  mismatchedNumber,
  counts: { before: beforeCounts, after: afterCounts },
  note: "tmp-hsv-verify.mjs is not valid evidence (DATABASE_URL missing).",
  fingerprints: Object.fromEntries(
    await Promise.all(
      Object.entries(CANONICAL).map(async ([role, spec]) => {
        const row = await findByIngestKey(spec.ingestKey);
        return [
          role,
          row
            ? {
                eventNumber: row.eventNumber,
                notesFp: fingerprintNotes(row.privateNotes),
                version: row.version,
                missionLinked: Boolean(row.campaignMission),
              }
            : null,
        ];
      }),
    ),
  ),
};

const proofPath = path.join(
  root,
  "develop_notes/database_proofs/hsv-ingest-source-alignment-latest.json",
);
fs.mkdirSync(path.dirname(proofPath), { recursive: true });
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n", "utf8");

await prisma.$disconnect();

console.log(`\nHSV placement validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
