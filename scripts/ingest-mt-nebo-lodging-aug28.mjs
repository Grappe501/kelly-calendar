/**
 * Aug 28 — Travel to Mt. Nebo area for Airbnb lodging
 * Support for Mt. Nebo Chicken Fry (Aug 29). Exact Airbnb TBD — do not invent address.
 *
 * Usage: npm run events:ingest:mt-nebo-lodging-aug28
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "MT-NEBO-LODGING-2026-08-28";
const KEY = "travel-lodging-mt-nebo-2026-08-28";
const CHICKEN_KEY = "mt-nebo-chicken-fry-2026-08-29";

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

function chicagoLocalToDate(localIso) {
  return new Date(`${localIso}-05:00`);
}

function notes(ingestKey, text) {
  return `[ingestKey:${ingestKey}]\n[pass:${PASS}]\n${text}`;
}

async function allocateEventNumber(tx, year) {
  const existing = await tx.eventNumberCounter.findUnique({ where: { year } });
  if (!existing) {
    await tx.eventNumberCounter.create({ data: { year, nextValue: 2 } });
    return `KCCC-${year}-0001`;
  }
  const current = existing.nextValue;
  await tx.eventNumberCounter.update({
    where: { year },
    data: { nextValue: { increment: 1 } },
  });
  return `KCCC-${year}-${String(current).padStart(4, "0")}`;
}

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
}

const proof = {
  pass: PASS,
  lodging: null,
  chickenFry: null,
  openDecisions: [
    "Book / confirm Airbnb in Mt. Nebo area (exact property TBD — do not invent address).",
    "Lock depart time from home / Clark County return path on Aug 28.",
  ],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "travel", archivedAt: null },
  });
  if (!calendar) throw new Error("travel calendar missing");

  // Soft evening travel → overnight lodging → clear before chicken fry ~10:00 AM.
  const startsAt = chicagoLocalToDate("2026-08-28T16:00:00");
  const endsAt = chicagoLocalToDate("2026-08-29T09:00:00");

  const privateNotes = notes(
    KEY,
    [
      "SOURCE: Operator — Aug 28 travel to Mt. Nebo area for Airbnb lodging.",
      "SUPPORT for mt-nebo-chicken-fry-2026-08-29 (Sat Aug 29 Dardanelle).",
      "STATUS: HOLD — Airbnb property TBD; do not invent street address or confirmation number.",
      "WINDOW: Soft afternoon/evening travel Aug 28 → overnight lodging → morning clear for chicken fry.",
      "SAME-WEEKEND: Evening Aug 29 travel-marion-2026-08-29 after chicken fry.",
      "Prior day: clark-county-meeting-arkadelphia-2026-08-27 (Confirmed).",
    ].join("\n"),
  );

  const data = {
    internalTitle: "Travel / Airbnb lodging – Mt. Nebo area",
    campaignDisplayTitle: "Travel / Airbnb – Mt. Nebo area",
    eventType: "Travel / Lodging",
    status: "HOLD",
    priority: "High",
    startsAt,
    endsAt,
    timezone: "America/Chicago",
    isAllDay: false,
    city: "Dardanelle",
    state: "Arkansas",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes,
    primaryCalendarId: calendar.id,
  };

  const existing = await findByIngestKey(KEY);
  let lodging;
  if (existing) {
    lodging = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: existing.status === "CANCELLED" ? "HOLD" : data.status,
        version: { increment: 1 },
      },
    });
    console.log(`UPDATED: ${KEY} → ${lodging.eventNumber}`);
  } else {
    lodging = await prisma.$transaction(async (tx) => {
      const eventNumber = await allocateEventNumber(tx, 2026);
      const created = await tx.event.create({
        data: {
          eventNumber,
          sourceType: "MANUAL",
          createdByUserId: actorUser.id,
          ownerUserId: actorUser.id,
          ...data,
          version: 1,
        },
      });
      await tx.eventCalendarMembership.create({
        data: {
          eventId: created.id,
          calendarId: calendar.id,
          membershipType: "PRIMARY",
          isPrimary: true,
          createdByUserId: actorUser.id,
        },
      });
      await tx.eventStatusHistory.create({
        data: {
          eventId: created.id,
          fromStatus: null,
          toStatus: created.status,
          changedByUserId: actorUser.id,
          reason: `Ingest ${PASS}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorUser.id,
          actorType: "USER",
          action: "EVENT_CREATED",
          entityType: "Event",
          entityId: created.id,
          source: "mt-nebo-lodging-aug28-ingest",
          reason: `Ingest ${PASS}`,
          newStateRedacted: {
            eventNumber: created.eventNumber,
            ingestKey: KEY,
            status: created.status,
          },
        },
      });
      return created;
    });
    console.log(`CREATED: ${KEY} → ${lodging.eventNumber}`);
  }

  proof.lodging = {
    key: KEY,
    eventNumber: lodging.eventNumber,
    status: lodging.status,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };

  const chicken = await findByIngestKey(CHICKEN_KEY);
  if (chicken) {
    const chickenNotes = notes(
      CHICKEN_KEY,
      [
        "Community festival / voter outreach – Dardanelle / Mt. Nebo area.",
        "ARRIVAL: From travel-lodging-mt-nebo-2026-08-28 (Airbnb lodging night of Aug 28) — not early same-day drive from home.",
        "Evening travel to Marion County lodging — travel-marion-2026-08-29.",
      ].join("\n"),
    );
    const updatedChicken = await prisma.event.update({
      where: { id: chicken.id },
      data: {
        privateNotes: chickenNotes,
        version: { increment: 1 },
      },
    });
    proof.chickenFry = {
      key: CHICKEN_KEY,
      eventNumber: updatedChicken.eventNumber,
      status: updatedChicken.status,
    };
    console.log(`UPDATED: ${CHICKEN_KEY} → ${updatedChicken.eventNumber}`);
  } else {
    console.warn(`WARN: missing ${CHICKEN_KEY} — lodging created without chicken-fry cross-note`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "mt-nebo-lodging-aug28-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
