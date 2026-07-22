/**
 * Standing office hours are POLICY busy blocks only — not calendar Events.
 * This script CANCELS any previously materialized standing-office rows so they
 * no longer fill the calendar or inflate counts.
 *
 * Usage: npm run events:ingest:standing-office-hours
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "STANDING-OFFICE-HIDE-2026-07-21";
const SOURCE = "standing-office-hours-retire";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: standing office retire blocked on Netlify/production without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
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
spawnSync(process.execPath, ["scripts/run-prisma.cjs", "generate"], {
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

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const proof = {
  pass: PASS,
  mode: "retire_listed_office_hours",
  policy: "Weekday 8–12 / 1–5 remain blocked as background availability only — not listed Events.",
  cancelled: [],
  alreadyCancelled: 0,
};

try {
  const rows = await prisma.event.findMany({
    where: {
      archivedAt: null,
      OR: [
        { eventType: "Campaign Office Hours" },
        { privateNotes: { contains: "[ingestKey:standing-office-" } },
        {
          AND: [
            { sourceType: "SYSTEM" },
            { internalTitle: { contains: "Campaign Office Hours" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      eventNumber: true,
      status: true,
      privateNotes: true,
    },
  });

  console.log(`--- ${PASS} retire ${rows.length} standing office rows ---`);

  for (const row of rows) {
    if (row.status === "CANCELLED") {
      proof.alreadyCancelled += 1;
      continue;
    }
    await prisma.event.update({
      where: { id: row.id },
      data: {
        status: "CANCELLED",
        privateNotes: `${row.privateNotes ?? ""}\n[RETIRED:${PASS}] Office hours are policy busy blocks only — not listed on calendar or counted.`,
        version: { increment: 1 },
      },
    });
    proof.cancelled.push(row.eventNumber);
    console.log(`CANCEL listed office block: ${row.eventNumber}`);
  }

  await prisma.auditLog.create({
    data: {
      actorType: "SYSTEM",
      action: "STANDING_OFFICE_RETIRED",
      entityType: "Event",
      entityId: "standing-office-hours",
      source: SOURCE,
      reason: `Retired ${proof.cancelled.length} listed office-hour Events (${PASS})`,
      newStateRedacted: {
        cancelledCount: proof.cancelled.length,
        alreadyCancelled: proof.alreadyCancelled,
      },
    },
  });

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "standing-office-hours-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    `PASS: cancelled=${proof.cancelled.length} alreadyCancelled=${proof.alreadyCancelled}`,
  );
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
