/**
 * Shela Norman (Bella Vista) — August Benton lodging offer + FOIA note
 * Source email: Sun Jul 12, 2026 (post Bella Vista meet).
 * Phones/emails stay in CRM only — never commit.
 *
 * Usage: npm run events:ingest:shela-benton-lodging
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "SHELA-BENTON-LODGING-2026-07-12";
const IMMERSION_KEY = "nwa-immersion-tour-2026-08-17";
const DRAFT_ID = "draft_obs_benton_aug_trip_2026";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: ingest blocked on Netlify/production without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
  );
  process.exit(1);
}

const childEnv = {
  ...process.env,
  NODE_ENV: isDeployRuntime ? process.env.NODE_ENV : "development",
};

spawnSync(process.execPath, ["scripts/ensure-app-session-secret.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: childEnv,
});

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
for (const key of ["DATABASE_URL", "DIRECT_URL", "APP_SESSION_SECRET"]) {
  if (loaded[key] && !process.env[key]) process.env[key] = loaded[key];
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("FAIL: DATABASE_URL missing");
  process.exit(1);
}

childEnv.DATABASE_URL = process.env.DATABASE_URL;
childEnv.DIRECT_URL = process.env.DIRECT_URL;
childEnv.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET;

for (const script of ["scripts/seed-auth-users.mjs", "scripts/database-seed-reference.mjs"]) {
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
    env: childEnv,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function notes(ingestKey, text) {
  return `[ingestKey:${ingestKey}]\n[pass:${PASS}]\n${text}`;
}

const DRAFT_PAYLOAD = {
  draftId: DRAFT_ID,
  status: "PLANNING",
  basic: {
    primaryCalendar: "Travel",
    additionalCalendars: [],
    eventType: "Campaign Travel / Regional Organizing",
    internalTitle: "August Benton County Campaign Trip",
    campaignDisplayTitle: "August Benton County Campaign Trip",
    priority: "High",
    confirmationStatus: "Hold",
  },
  timing: {
    timezone: "America/Chicago",
    allDay: false,
    note: "Primary stay window: NWA Immersion Tour Aug 17–20 (HOLD). Lodging decision pending.",
  },
  location: {
    state: "Arkansas",
    county: "Benton",
    cities: ["Bentonville", "Rogers", "Bella Vista"],
    locationDisclosure: "CITY",
  },
  privateMissionNotes: [
    "SOURCE: Shela L. Norman email Sun Jul 12, 2026 (after Bella Vista meet with Kelly + Scott).",
    "NOT a dated calendar Event until lodging accepted and itinerary locks.",
    "LODGING OFFER: Shela Norman Bella Vista Airbnb — available for the Benton return window. Status: OFFERED (not yet accepted). Respond yes/no.",
    "Links to live HOLD: nwa-immersion-tour-2026-08-17 (Aug 17–20 Benton County immersion).",
    "FOIA tax-rolls request: Shela asked Scott for helpful info to submit. Campaign calendar does not own this — Scott follow-up / CRM only.",
    "Contact phone/email in operator CRM only — never commit.",
  ].join("\n"),
  openDecisions: [
    "Accept Shela Norman Bella Vista Airbnb for Aug 17–20 Benton immersion?",
    "Confirm FOIA tax-rolls path stays with Scott (no Kelly calendar block).",
  ],
};

const IMMERSION_NOTES = notes(
  IMMERSION_KEY,
  [
    "MISSION ID: NWA-IMMERSION-2026-01. Tier 1 Highest Priority. Status: Planning.",
    "Build Benton County via daytime immersion + nightly JP-hosted community rallies (hosts TBD).",
    "Mon travel in · Thu evening return Rose Bud.",
    "REQUIRED nightly intelligence report; end: Benton County Summary + 90-day plan.",
    "Do not invent four Confirmed rallies until JP hosts/venues lock — evening slots TBD inside this umbrella.",
    "LODGING: Shela Norman (Bella Vista) offered Airbnb for this return window (email Jul 12, 2026). Status: OFFERED — accept/decline pending. See draft_obs_benton_aug_trip_2026.",
    "FOIA tax-rolls ask from same email is Scott-owned — not a mission day block.",
  ].join("\n"),
);

const proof = {
  pass: PASS,
  draft: null,
  immersion: null,
  classification: "CRM / lodging offer — no new dated Event",
  omittedFromGit: ["Contact phone numbers", "Contact emails"],
  openDecisions: DRAFT_PAYLOAD.openDecisions,
};

try {
  const immersion = await prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${IMMERSION_KEY}]` } },
  });
  if (!immersion) {
    throw new Error(`Missing immersion event for key ${IMMERSION_KEY}`);
  }

  const updated = await prisma.event.update({
    where: { id: immersion.id },
    data: {
      privateNotes: IMMERSION_NOTES,
      version: { increment: 1 },
    },
  });
  proof.immersion = {
    key: IMMERSION_KEY,
    eventNumber: updated.eventNumber,
    status: updated.status,
  };
  console.log(`UPDATED: ${IMMERSION_KEY} → ${updated.eventNumber}`);

  await prisma.eventPlanningDraft.upsert({
    where: { id: DRAFT_ID },
    create: {
      id: DRAFT_ID,
      status: "PLANNING",
      title: "August Benton County Campaign Trip",
      primaryCalendar: "Travel",
      payload: DRAFT_PAYLOAD,
      draftVersion: 1,
    },
    update: {
      status: "PLANNING",
      title: "August Benton County Campaign Trip",
      primaryCalendar: "Travel",
      payload: DRAFT_PAYLOAD,
      draftVersion: { increment: 1 },
    },
  });
  proof.draft = { id: DRAFT_ID, status: "PLANNING" };
  console.log(`DRAFT: ${DRAFT_ID}`);

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "shela-benton-lodging-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
