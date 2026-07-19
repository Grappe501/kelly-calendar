/**
 * Operator week live ingest (Feature Freeze compliant — no new UI).
 * Creates three canonical Events via Prisma using the same shape as
 * createCanonicalEvent. Requires local APP_SESSION_SECRET + auth users +
 * reference calendars. Never prints secrets or full addresses.
 *
 * Usage (from Kelly-calendar):
 *   node scripts/run-with-h-drive-env.cjs node scripts/ingest-operator-week-events.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Refuse only real deploy targets — local NODE_ENV=production must not block operator ingest. */
const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: operator live ingest blocked on Netlify/production deploy without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
  );
  process.exit(1);
}

/** Local operator ingest must not inherit a misleading NODE_ENV=production. */
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
  console.error("FAIL: DATABASE_URL missing — cannot ingest");
  process.exit(1);
}
if (!process.env.APP_SESSION_SECRET || process.env.APP_SESSION_SECRET.trim().length < 32) {
  console.error("FAIL: APP_SESSION_SECRET missing or too short — auth not ready");
  process.exit(1);
}

childEnv.DATABASE_URL = process.env.DATABASE_URL;
childEnv.DIRECT_URL = process.env.DIRECT_URL;
childEnv.APP_SESSION_SECRET = process.env.APP_SESSION_SECRET;

// Ensure synthetic users + reference calendars (idempotent)
for (const script of ["scripts/seed-auth-users.mjs", "scripts/database-seed-reference.mjs"]) {
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
    env: childEnv,
  });
  if (r.status !== 0) {
    console.error(`FAIL: ${script} exited ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

/** Chicago local wall times → Date (handles CDT offset for Jul 2026). */
function chicagoLocalToDate(localIso) {
  // localIso: YYYY-MM-DDTHH:mm:ss interpreted as America/Chicago
  const asUtcGuess = new Date(`${localIso}-05:00`); // CDT
  return asUtcGuess;
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

const EVENTS = [
  {
    key: "fundraiser-cd2-2026-07-19",
    calendarSlug: "fundraising",
    internalTitle: "Fundraiser for Dr. Chris Jones — US Congressional District 2",
    campaignDisplayTitle: "Fundraiser for Dr. Chris Jones — US CD-2",
    eventType: "Fundraiser",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-19T17:00:00"),
    endsAt: chicagoLocalToDate("2026-07-19T19:00:00"),
    city: "Little Rock",
    venueName: "Private residence (host home)",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
  },
  {
    key: "isp-window-2026-07-20",
    calendarSlug: "protected-personal",
    internalTitle: "Internet service install window",
    campaignDisplayTitle: "Personal — Internet install",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T08:00:00"),
    endsAt: chicagoLocalToDate("2026-07-20T10:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
  },
  {
    key: "property-walk-2026-07-20",
    calendarSlug: "protected-personal",
    internalTitle: "Property walk / farm clean-up consult",
    campaignDisplayTitle: "Personal — Property consult",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T09:00:00"),
    endsAt: chicagoLocalToDate("2026-07-20T11:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
  },
];

const proof = {
  generatedAt: new Date().toISOString(),
  scope: "enable_live_ingest_no_new_ui",
  featureFreeze: "honored",
  dates: ["2026-07-19", "2026-07-20"],
  timezone: "America/Chicago",
  events: [],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) {
    throw new Error("Kelly synthetic user missing after auth:seed");
  }

  const calendars = await prisma.calendar.findMany({
    where: { slug: { in: ["fundraising", "protected-personal"] }, archivedAt: null },
  });
  const bySlug = Object.fromEntries(calendars.map((c) => [c.slug, c]));
  if (!bySlug.fundraising || !bySlug["protected-personal"]) {
    throw new Error("Required calendars missing after db:seed:reference");
  }

  for (const spec of EVENTS) {
    const calendar = bySlug[spec.calendarSlug];
    const existing = await prisma.event.findFirst({
      where: {
        primaryCalendarId: calendar.id,
        internalTitle: spec.internalTitle,
        startsAt: spec.startsAt,
        archivedAt: null,
      },
      select: { id: true, eventNumber: true, status: true },
    });
    if (existing) {
      proof.events.push({
        key: spec.key,
        action: "skipped_existing",
        eventId: existing.id,
        eventNumber: existing.eventNumber,
        calendarSlug: spec.calendarSlug,
      });
      console.log(`SKIP: ${spec.key} already present (${existing.eventNumber})`);
      continue;
    }

    const created = await prisma.$transaction(async (tx) => {
      const year = spec.startsAt.getFullYear();
      const eventNumber = await allocateEventNumber(tx, year);
      const event = await tx.event.create({
        data: {
          eventNumber,
          sourceType: "MANUAL",
          createdByUserId: actorUser.id,
          ownerUserId: actorUser.id,
          primaryCalendarId: calendar.id,
          internalTitle: spec.internalTitle,
          campaignDisplayTitle: spec.campaignDisplayTitle,
          restrictedDisplayTitle: spec.restrictedDisplayTitle ?? null,
          publicTitle: null,
          eventType: spec.eventType,
          status: spec.status,
          startsAt: spec.startsAt,
          endsAt: spec.endsAt,
          timezone: "America/Chicago",
          city: spec.city ?? null,
          venueName: spec.venueName ?? null,
          locationDisclosure: spec.locationDisclosure,
          defaultVisibility: spec.defaultVisibility,
          candidateRole: spec.candidateRole ?? null,
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
          reason: "Operator week ingest 2026-07-19",
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorUser.id,
          actorType: "USER",
          action: "EVENT_CREATED",
          entityType: "Event",
          entityId: event.id,
          source: "operator-week-ingest",
          reason: "Operator week live ingest (script)",
          newStateRedacted: {
            eventNumber: event.eventNumber,
            title: event.internalTitle,
            status: event.status,
            ingestKey: spec.key,
          },
        },
      });
      return event;
    });

    proof.events.push({
      key: spec.key,
      action: "created",
      eventId: created.id,
      eventNumber: created.eventNumber,
      calendarSlug: spec.calendarSlug,
      status: created.status,
    });
    console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
  }

  const weekStart = chicagoLocalToDate("2026-07-19T00:00:00");
  const weekEnd = chicagoLocalToDate("2026-07-26T00:00:00");
  const listed = await prisma.event.findMany({
    where: {
      archivedAt: null,
      startsAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      eventNumber: true,
      internalTitle: true,
      startsAt: true,
      primaryCalendar: { select: { slug: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  proof.weekVerifyCount = listed.length;
  proof.weekVerify = listed.map((e) => ({
    eventNumber: e.eventNumber,
    calendarSlug: e.primaryCalendar.slug,
    startsAt: e.startsAt.toISOString(),
    title: e.internalTitle,
  }));

  const proofsDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(proofsDir, { recursive: true });
  const outPath = path.join(proofsDir, "operator-week-ingest-latest.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(`PASS: week window events visible to DB query: ${listed.length}`);
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
