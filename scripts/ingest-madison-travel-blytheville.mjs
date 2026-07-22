/**
 * Operator calendar pass:
 * - Sep 2: Travel to Madison County 5–9 PM + local Airbnb overnight (for Sep 3 meeting)
 * - Jul 26: Restore Blytheville church day + candidate forum (were Pass-2 cancelled)
 *
 * Usage: npm run events:ingest:madison-travel-blytheville
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "MADISON-TRAVEL-BLYTHEVILLE-2026-07-21";
const TRAVEL_KEY = "travel-madison-2026-09-02";
const LODGING_KEY = "lodging-madison-airbnb-2026-09-02";
const MADISON_KEY = "madison-county-2026-09-03";
const CHURCH_KEY = "blytheville-churches-2026-07-26";
const FORUM_KEY = "blytheville-forum-2026-07-26";

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

async function upsertEvent({
  key,
  calendarSlug,
  data,
  source,
  createStatus,
}) {
  const calendar = await prisma.calendar.findFirst({
    where: { slug: calendarSlug, archivedAt: null },
  });
  if (!calendar) throw new Error(`${calendarSlug} calendar missing`);

  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const payload = {
    ...data,
    timezone: "America/Chicago",
    primaryCalendarId: calendar.id,
    privateNotes: data.privateNotes,
  };

  const existing = await findByIngestKey(key);
  if (existing) {
    const fromStatus = existing.status;
    const toStatus =
      existing.status === "CANCELLED" ? createStatus : (data.status ?? createStatus);
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...payload,
        status: toStatus,
        version: { increment: 1 },
      },
    });
    if (fromStatus !== toStatus) {
      await prisma.eventStatusHistory.create({
        data: {
          eventId: updated.id,
          fromStatus,
          toStatus,
          changedByUserId: actorUser.id,
          reason: `Ingest ${PASS} — restore/update`,
        },
      });
    }
    console.log(`UPDATED: ${key} → ${updated.eventNumber} (${fromStatus}→${updated.status})`);
    return updated;
  }

  const created = await prisma.$transaction(async (tx) => {
    const eventNumber = await allocateEventNumber(tx, 2026);
    const event = await tx.event.create({
      data: {
        eventNumber,
        sourceType: "MANUAL",
        createdByUserId: actorUser.id,
        ownerUserId: actorUser.id,
        ...payload,
        status: createStatus,
        version: 1,
      },
    });
    await tx.eventCalendarMembership.create({
      data: {
        eventId: event.id,
        calendarId: calendar.id,
        membershipType: "PRIMARY",
        isPrimary: true,
        createdByUserId: actorUser.id,
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: null,
        toStatus: event.status,
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
        entityId: event.id,
        source,
        reason: `Ingest ${PASS}`,
        newStateRedacted: {
          eventNumber: event.eventNumber,
          ingestKey: key,
          status: event.status,
        },
      },
    });
    return event;
  });
  console.log(`CREATED: ${key} → ${created.eventNumber}`);
  return created;
}

const proof = {
  pass: PASS,
  madisonTravel: null,
  madisonLodging: null,
  madisonMeeting: null,
  blythevilleChurch: null,
  blythevilleForum: null,
  openDecisions: [
    "Book / confirm Madison County Airbnb (exact property TBD).",
    "Lock Madison Sep 3 clock/venue/program subtype.",
    "Lock Blytheville church names / visit order if needed for prep.",
    "Confirm Blytheville forum venue + exact clock if different from Pass-1 placeholders.",
  ],
};

try {
  const travel = await upsertEvent({
    key: TRAVEL_KEY,
    calendarSlug: "travel",
    source: "madison-travel-blytheville-ingest",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Madison County",
      campaignDisplayTitle: "Travel to Madison County",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-02T17:00:00"),
      endsAt: chicagoLocalToDate("2026-09-02T21:00:00"),
      isAllDay: false,
      city: "Huntsville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        TRAVEL_KEY,
        [
          "SOURCE: Operator — Sep 2 travel to Madison County 5:00–9:00 PM America/Chicago.",
          "SUPPORT for madison-county-2026-09-03 (Thu Sep 3 meeting / program TBD).",
          "FOLLOWED BY: lodging-madison-airbnb-2026-09-02 (local Airbnb overnight).",
          "Do not invent route or stop list.",
        ].join("\n"),
      ),
    },
  });
  proof.madisonTravel = {
    key: TRAVEL_KEY,
    eventNumber: travel.eventNumber,
    status: travel.status,
  };

  const lodging = await upsertEvent({
    key: LODGING_KEY,
    calendarSlug: "travel",
    source: "madison-travel-blytheville-ingest",
    createStatus: "HOLD",
    data: {
      internalTitle: "Airbnb lodging – Madison County (local)",
      campaignDisplayTitle: "Airbnb – Madison County",
      eventType: "Travel / Lodging",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-02T21:00:00"),
      endsAt: chicagoLocalToDate("2026-09-03T08:00:00"),
      isAllDay: false,
      city: "Huntsville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        LODGING_KEY,
        [
          "SOURCE: Operator — lodge overnight locally (Airbnb) for Madison County meeting the following day.",
          "SUPPORT for madison-county-2026-09-03.",
          "ARRIVAL: After travel-madison-2026-09-02 (5:00–9:00 PM).",
          "STATUS: HOLD — Airbnb property TBD; do not invent street address or confirmation number.",
        ].join("\n"),
      ),
    },
  });
  proof.madisonLodging = {
    key: LODGING_KEY,
    eventNumber: lodging.eventNumber,
    status: lodging.status,
  };

  const madison = await findByIngestKey(MADISON_KEY);
  if (madison) {
    const updated = await prisma.event.update({
      where: { id: madison.id },
      data: {
        privateNotes: notes(
          MADISON_KEY,
          [
            "SOURCE: Google Calendar invite Jul 11, 2026 — title “Madison county”. Kelly Grappe organizer.",
            "DATE CONFIRMED: Thursday Sep 3, 2026. Clock time, venue, and event subtype NOT on invite → isAllDay until locked.",
            "LOCATION: Madison County (default city Huntsville — county seat). Venue TBD — do not invent address.",
            "ARRIVAL: From travel-madison-2026-09-02 (5–9 PM) + lodging-madison-airbnb-2026-09-02 (local Airbnb overnight).",
            "CANDIDATE: Expected in-county presence; speaking role TBD until program known.",
            "OVERRIDES standing Campaign Office Hours for this Thursday.",
            "Guest emails (Kelly / Steve Google accounts) in CRM/calendar only — never commit.",
          ].join("\n"),
        ),
        version: { increment: 1 },
      },
    });
    proof.madisonMeeting = {
      key: MADISON_KEY,
      eventNumber: updated.eventNumber,
      status: updated.status,
    };
    console.log(`UPDATED: ${MADISON_KEY} → ${updated.eventNumber}`);
  } else {
    console.warn(`WARN: missing ${MADISON_KEY}`);
  }

  // Restore Jul 26 Blytheville — Pass 2 had cancelled these; operator restores as live day.
  const church = await upsertEvent({
    key: CHURCH_KEY,
    calendarSlug: "field",
    source: "madison-travel-blytheville-ingest",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Blytheville church day",
      campaignDisplayTitle: "Blytheville church day",
      eventType: "Faith Community Engagement",
      status: "CONFIRMED",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-07-26T09:00:00"),
      endsAt: chicagoLocalToDate("2026-07-26T12:30:00"),
      isAllDay: false,
      city: "Blytheville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        CHURCH_KEY,
        [
          "SOURCE: Operator restore — Jul 26 is Blytheville church day (was Pass-2 cancelled; restored).",
          "SAME DAY: blytheville-forum-2026-07-26 (candidate forum).",
          "PRIOR NIGHT: lodging-blytheville-2026-07-25 (overnight transition).",
          "Church names / visit order TBD — do not invent congregations or addresses.",
          "Soft morning window 9:00–12:30 CT until exact schedule locks.",
        ].join("\n"),
      ),
    },
  });
  proof.blythevilleChurch = {
    key: CHURCH_KEY,
    eventNumber: church.eventNumber,
    status: church.status,
  };

  const forum = await upsertEvent({
    key: FORUM_KEY,
    calendarSlug: "public-events",
    source: "madison-travel-blytheville-ingest",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Blytheville candidate forum",
      campaignDisplayTitle: "Blytheville candidate forum",
      eventType: "Campaign Candidate Forum / Speaking Engagement",
      status: "CONFIRMED",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-07-26T18:00:00"),
      endsAt: chicagoLocalToDate("2026-07-26T20:30:00"),
      isAllDay: false,
      city: "Blytheville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        FORUM_KEY,
        [
          "SOURCE: Operator restore — Jul 26 Blytheville candidate forum (was Pass-2 cancelled; restored).",
          "SAME DAY: blytheville-churches-2026-07-26 (church day).",
          "Venue / exact clock soft placeholder 6:00–8:30 PM CT until locked — do not invent address.",
          "NE Arkansas weekend context: Cave City festival + Blytheville lodging Sat → church + forum Sun.",
        ].join("\n"),
      ),
    },
  });
  proof.blythevilleForum = {
    key: FORUM_KEY,
    eventNumber: forum.eventNumber,
    status: forum.status,
  };

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "madison-travel-blytheville-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
