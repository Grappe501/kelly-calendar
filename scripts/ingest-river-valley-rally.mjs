/**
 * River Valley Has a Choice — Fort Smith rally ingest
 * No guest emails in this file (CRM only).
 *
 * Usage: npm run events:ingest:river-valley-rally
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "RIVER-VALLEY-RALLY-2026-09-13";
const KEY = "river-valley-has-a-choice-rally-2026-09-13";

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

function notes(text) {
  return `[ingestKey:${KEY}]\n[pass:${PASS}]\n${text}`;
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

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "public-events", archivedAt: null },
  });
  if (!calendar) throw new Error("public-events calendar missing");

  const startsAt = chicagoLocalToDate("2026-09-13T13:00:00"); // speaker arrival
  const endsAt = chicagoLocalToDate("2026-09-13T16:00:00");

  const privateNotes = notes(
    [
      "MISSION: Tier 1 multi-candidate Democratic ticket rally — River Valley / Sebastian County.",
      "PUBLIC PROGRAM: 2:00–4:00 PM. Speaker arrival 1:00 PM (block starts 1:00).",
      "VENUE: Fort Smith Convention Center, 55 South 7th Street, Fort Smith, AR 72901.",
      "LEAD/ORGANIZER: Guzman for Arkansas (Eduardo Guzman) with Sebastian County party and ticket partners.",
      "EXPECTED ATTENDANCE: 1,000+.",
      "PURPOSE: Unified ticket momentum; fair-atmosphere candidate tables before program; music; security; concessions.",
      "ADVERTISING: Kick-off planned mid-July.",
      "SPEAKER LINE-UP (names only — guest emails in CRM/calendar invite, not here):",
      "  Rep. Jay Richardson (HD-49)",
      "  Wendy Peer (HD-50)",
      "  Jane-Ellen Udouj-Kutchka (HD-51)",
      "  Ryan \"Chief Chops\" Intchauspe (HD-24)",
      "  Courtney King (HD-25)",
      "  Eduardo Guzman (SD-27)",
      "  Kelly Grappe (Secretary of State)",
      "  Robb Ryerse (US House)",
      "  James Russell (US House)",
      "  Hallie Shoffner (US Senate)",
      "  Sen. Fred Love (Governor)",
      "PREP: Campaign table; literature; merch if permitted; photo/video; arrival by 1:00 PM.",
      "FOLLOW-UP: Contacts from table; thank organizers; share recap.",
    ].join("\n"),
  );

  const data = {
    internalTitle: "“The River Valley Has a Choice” Campaign Rally",
    campaignDisplayTitle: "The River Valley Has a Choice – Campaign Rally",
    eventType: "Campaign Rally / Multi-Candidate Ticket Event",
    status: "CONFIRMED",
    priority: "High",
    startsAt,
    endsAt,
    timezone: "America/Chicago",
    city: "Fort Smith",
    venueName: "Fort Smith Convention Center",
    streetAddress: "55 South 7th Street",
    postalCode: "72901",
    state: "Arkansas",
    locationDisclosure: "VENUE",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    candidateAttendance: true,
    expectedAttendance: 1000,
    privateNotes,
    primaryCalendarId: calendar.id,
  };

  const existing = await prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${KEY}]` } },
  });

  let event;
  if (existing) {
    event = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    console.log(`UPDATED: ${KEY} → ${event.eventNumber}`);
  } else {
    event = await prisma.$transaction(async (tx) => {
      const year = 2026;
      const eventNumber = await allocateEventNumber(tx, year);
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
          toStatus: "CONFIRMED",
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
          source: "river-valley-rally-ingest",
          reason: `Ingest ${PASS}`,
          newStateRedacted: {
            eventNumber: created.eventNumber,
            ingestKey: KEY,
            status: "CONFIRMED",
          },
        },
      });
      return created;
    });
    console.log(`CREATED: ${KEY} → ${event.eventNumber}`);
  }

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "river-valley-rally-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        pass: PASS,
        key: KEY,
        eventNumber: event.eventNumber,
        status: event.status,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        omittedFromGit: ["Guest invitation emails"],
      },
      null,
      2,
    ),
  );
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
