/**
 * Pope County Dem HQ — Chamber ribbon cutting (Aug 6, 2026)
 * Contact phones/emails stay in CRM only.
 *
 * Usage: npm run events:ingest:pope-ribbon-cutting
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "POPE-RIBBON-2026-08-06";
const KEY = "pope-hq-chamber-ribbon-cutting-2026-08-06";
const TRAVEL_KEY = "travel-rosebud-home-2026-08-06";

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

async function upsert(actorUser, calendar, spec) {
  const existing = await findByIngestKey(spec.key);
  const data = {
    internalTitle: spec.internalTitle,
    campaignDisplayTitle: spec.campaignDisplayTitle,
    eventType: spec.eventType,
    status: spec.status,
    priority: spec.priority ?? "High",
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    timezone: "America/Chicago",
    city: spec.city ?? null,
    venueName: spec.venueName ?? null,
    streetAddress: spec.streetAddress ?? null,
    postalCode: spec.postalCode ?? null,
    state: "Arkansas",
    locationDisclosure: spec.locationDisclosure,
    defaultVisibility: spec.defaultVisibility,
    candidateRole: spec.candidateRole ?? null,
    candidateAttendance:
      spec.candidateAttendance === undefined ? null : spec.candidateAttendance,
    privateNotes: spec.privateNotes,
    primaryCalendarId: calendar.id,
  };

  if (existing) {
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
    return updated;
  }

  return prisma.$transaction(async (tx) => {
    const eventNumber = await allocateEventNumber(tx, spec.startsAt.getFullYear());
    const event = await tx.event.create({
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
        source: "pope-ribbon-cutting-ingest",
        reason: `Ingest ${PASS}`,
        newStateRedacted: {
          eventNumber: event.eventNumber,
          ingestKey: spec.key,
          status: event.status,
        },
      },
    });
    console.log(`CREATED: ${spec.key} → ${event.eventNumber}`);
    return event;
  });
}

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing");

  const bySlug = Object.fromEntries(
    (
      await prisma.calendar.findMany({
        where: {
          slug: { in: ["public-events", "county-activity", "travel"] },
          archivedAt: null,
        },
      })
    ).map((c) => [c.slug, c]),
  );

  const ribbon = await upsert(actorUser, bySlug["county-activity"], {
    key: KEY,
    internalTitle:
      "Chamber Ribbon Cutting – Democratic Party of Pope County Headquarters",
    campaignDisplayTitle:
      "Pope County Dem HQ – Chamber Ribbon Cutting",
    eventType: "Chamber Ribbon Cutting / County Headquarters",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-06T16:15:00"),
    endsAt: chicagoLocalToDate("2026-08-06T17:15:00"),
    city: "Russellville",
    venueName: "Democratic Party of Pope County 2026 Election Headquarters",
    streetAddress: "409 E. 4th Street",
    locationDisclosure: "VENUE",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    candidateRole: "ATTENDING",
    privateNotes: notes(
      KEY,
      [
        "CONFIRMED by Russellville Chamber of Commerce (Mary Ella Yamashita / Pope County Dems).",
        "Date: Thursday Aug 6, 2026 · 4:30 PM ribbon cutting · 409 E. 4th Street, Russellville.",
        "Kelly attending (Rus, Fred, Kelly expected; Hallie booked elsewhere that day).",
        "Chamber schedule:",
        "  4:15 Arrival — ambassadors & Chamber staff",
        "  4:30 Welcome / introduction — Chamber representative",
        "  4:35 Remarks — business/organization representative",
        "  4:40 Gathering & official photograph (source email typo said 'am')",
        "Chamber will invite Mayor, County Judge, Red Coat Ambassadors; alert local media.",
        "Grand Opening at a LATER date — bring materials that can carry into Fall.",
        "Related: draft_obs_pope_venue_planning_2026 (venue directory / HQ facility notes).",
        "Contact: Mary Ella Yamashita, Data Manager, Democratic Party of Pope County — phone/email in CRM only.",
        "After: travel home Rose Bud — travel-rosebud-home-2026-08-06.",
      ].join("\n"),
    ),
  });

  const travel = await upsert(actorUser, bySlug.travel, {
    key: TRAVEL_KEY,
    internalTitle: "Travel home – Rose Bud (after Pope HQ ribbon cutting)",
    campaignDisplayTitle: "Travel home – Rose Bud",
    eventType: "Travel / Return Home",
    status: "HOLD",
    priority: "Normal",
    startsAt: chicagoLocalToDate("2026-08-06T17:30:00"),
    endsAt: chicagoLocalToDate("2026-08-06T20:30:00"),
    city: "Rose Bud",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      TRAVEL_KEY,
      "After pope-hq-chamber-ribbon-cutting-2026-08-06. Restock / prep for Hope swing as needed.",
    ),
  });

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "pope-ribbon-cutting-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        pass: PASS,
        ribbon: { key: KEY, eventNumber: ribbon.eventNumber, status: ribbon.status },
        travel: { key: TRAVEL_KEY, eventNumber: travel.eventNumber, status: travel.status },
        omittedFromGit: ["Contact phone numbers", "Contact emails"],
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
