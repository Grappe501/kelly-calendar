/**
 * Rector, AR immersion — arrive Sat/Sun evening Sep 6, return Mon evening Sep 7
 * Operator: Travel 7–11 PM Sep 6; stay until Mon evening Sep 7 → Rose Bud; immersion days.
 * Note: Sep 6 2026 is Sunday (operator said Saturday) — date kept as stated.
 *
 * CONFLICT: Howard County Nashville travel/lodging also on Sep 7 — do not auto-resolve.
 *
 * Usage: npm run events:ingest:rector-immersion-sep6
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "RECTOR-IMMERSION-2026-09-06";
const TRAVEL_KEY = "travel-rector-2026-09-06";
const LODGING_KEY = "lodging-rector-2026-09-06";
const IMMERSION_KEY = "rector-immersion-2026-09-06";
const RETURN_KEY = "return-rector-rosebud-2026-09-07";
const HOWARD_TRAVEL_KEY = "travel-nashville-howard-2026-09-07";

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

async function upsertEvent({ key, calendarSlug, createStatus, source, data, actorUser }) {
  const calendar = await prisma.calendar.findFirst({
    where: { slug: calendarSlug, archivedAt: null },
  });
  if (!calendar) throw new Error(`${calendarSlug} calendar missing`);

  const payload = {
    ...data,
    timezone: "America/Chicago",
    primaryCalendarId: calendar.id,
  };

  const existing = await findByIngestKey(key);
  if (existing) {
    const fromStatus = existing.status;
    const toStatus =
      existing.status === "CANCELLED" ? createStatus : (data.status ?? createStatus);
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: { ...payload, status: toStatus, version: { increment: 1 } },
    });
    if (fromStatus !== toStatus) {
      await prisma.eventStatusHistory.create({
        data: {
          eventId: updated.id,
          fromStatus,
          toStatus,
          changedByUserId: actorUser.id,
          reason: `Ingest ${PASS}`,
        },
      });
    }
    console.log(`UPDATED: ${key} → ${updated.eventNumber}`);
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
  events: [],
  conflictsSurfaced: [
    "rector-immersion Sep 6–7 ∩ travel-nashville-howard-2026-09-07 / lodging-nashville-howard-2026-09-07 (operator must choose)",
  ],
  openDecisions: [
    "Resolve Rector immersion vs Howard County Nashville travel on Sep 7 — cannot do both as currently blocked.",
    "Confirm lodging property in Rector (Airbnb/hotel TBD).",
    "Lock Rector immersion hosts / stops (do not invent).",
  ],
  calendarNote:
    "Operator said Saturday Sep 6; 2026-09-06 is Sunday. Date kept as stated.",
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const specs = [
    {
      key: TRAVEL_KEY,
      calendarSlug: "travel",
      createStatus: "HOLD",
      data: {
        internalTitle: "Travel to Rector",
        campaignDisplayTitle: "Travel to Rector",
        eventType: "Travel / Mission Positioning",
        status: "HOLD",
        priority: "High",
        startsAt: chicagoLocalToDate("2026-09-06T19:00:00"),
        endsAt: chicagoLocalToDate("2026-09-06T23:00:00"),
        city: "Rector",
        state: "Arkansas",
        locationDisclosure: "CITY",
        defaultVisibility: "TITLE_LOCATION",
        candidateAttendance: true,
        privateNotes: notes(
          TRAVEL_KEY,
          [
            "SOURCE: Operator — travel to Rector, Arkansas 7:00–11:00 PM on September 6.",
            "CALENDAR NOTE: Sep 6 2026 is Sunday (operator said Saturday); date kept as stated.",
            "SUPPORT for rector-immersion-2026-09-06 + lodging-rector-2026-09-06.",
            "PRIOR DAY: jacksonville-festiville-naacp-2026-09-05 (Sat).",
            "CONFLICT: Sep 7 also has Howard County Nashville travel — do not auto-resolve.",
          ].join("\n"),
        ),
      },
    },
    {
      key: LODGING_KEY,
      calendarSlug: "travel",
      createStatus: "HOLD",
      data: {
        internalTitle: "Overnight lodging – Rector",
        campaignDisplayTitle: "Overnight – Rector",
        eventType: "Travel / Lodging",
        status: "HOLD",
        priority: "High",
        startsAt: chicagoLocalToDate("2026-09-06T23:00:00"),
        endsAt: chicagoLocalToDate("2026-09-07T17:00:00"),
        city: "Rector",
        state: "Arkansas",
        locationDisclosure: "CITY",
        defaultVisibility: "TITLE_LOCATION",
        candidateAttendance: true,
        privateNotes: notes(
          LODGING_KEY,
          [
            "SOURCE: Operator — stay in Rector until Monday evening Sep 7, then return Rose Bud.",
            "Property TBD — do not invent address.",
            "SUPPORT for rector-immersion-2026-09-06.",
            "CHECKOUT / DEPART: return-rector-rosebud-2026-09-07 (Mon evening).",
          ].join("\n"),
        ),
      },
    },
    {
      key: IMMERSION_KEY,
      calendarSlug: "county-activity",
      createStatus: "HOLD",
      data: {
        internalTitle: "Rector Immersion (Clay County)",
        campaignDisplayTitle: "Rector Immersion",
        eventType: "County Immersion / Relationship Building",
        status: "HOLD",
        priority: "High",
        isMultiDay: true,
        startsAt: chicagoLocalToDate("2026-09-06T23:00:00"),
        endsAt: chicagoLocalToDate("2026-09-07T17:00:00"),
        city: "Rector",
        state: "Arkansas",
        locationDisclosure: "CITY",
        defaultVisibility: "TITLE_LOCATION",
        candidateAttendance: true,
        privateNotes: notes(
          IMMERSION_KEY,
          [
            "SOURCE: Operator — immersion days in Rector after evening arrival Sep 6 through Monday Sep 7.",
            "COUNTY: Clay County (Rector). Hosts/stops TBD — do not invent itinerary.",
            "WINDOW: After travel-rector-2026-09-06 arrive → daytime Mon immersion → return Mon evening.",
            "CONFLICT: travel-nashville-howard-2026-09-07 / Howard Dem path same Mon — operator choose Rector vs Nashville.",
            "REQUIRED: county intelligence notes + follow-ups before leaving town.",
          ].join("\n"),
        ),
      },
    },
    {
      key: RETURN_KEY,
      calendarSlug: "travel",
      createStatus: "HOLD",
      data: {
        internalTitle: "Return Rector → Rose Bud",
        campaignDisplayTitle: "Return to Rose Bud (from Rector)",
        eventType: "Travel / Return Home",
        status: "HOLD",
        priority: "High",
        startsAt: chicagoLocalToDate("2026-09-07T17:00:00"),
        endsAt: chicagoLocalToDate("2026-09-07T21:00:00"),
        city: "Rose Bud",
        state: "Arkansas",
        locationDisclosure: "CITY",
        defaultVisibility: "TITLE_LOCATION",
        candidateAttendance: true,
        privateNotes: notes(
          RETURN_KEY,
          [
            "SOURCE: Operator — Monday evening Sep 7 return from Rector to Rose Bud.",
            "Soft window 5:00–9:00 PM CT after immersion day; exact depart TBD.",
            "AFTER: lodging-rector-2026-09-06 ends at return start.",
          ].join("\n"),
        ),
      },
    },
  ];

  for (const spec of specs) {
    const event = await upsertEvent({
      ...spec,
      source: "rector-immersion-sep6-ingest",
      actorUser,
    });
    proof.events.push({
      key: spec.key,
      eventNumber: event.eventNumber,
      status: event.status,
    });
  }

  const howard = await findByIngestKey(HOWARD_TRAVEL_KEY);
  if (howard && !howard.privateNotes?.includes("rector-immersion-2026-09-06")) {
    await prisma.event.update({
      where: { id: howard.id },
      data: {
        privateNotes: `${howard.privateNotes}\n[${PASS}] CONFLICT: rector-immersion-2026-09-06 / travel-rector-2026-09-06 keep Kelly in Rector through Mon evening Sep 7 — cannot also travel Nashville same day. Operator must choose.`,
        version: { increment: 1 },
      },
    });
    console.log(`PATCHED conflict note: ${HOWARD_TRAVEL_KEY}`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "rector-immersion-sep6-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
