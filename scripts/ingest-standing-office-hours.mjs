/**
 * Materialize Mon–Fri Campaign Office Hours as Busy calendar events.
 * Skips windows that already overlap a non-standing campaign/travel/mission event.
 *
 * Usage: npm run events:ingest:standing-office-hours
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "STANDING-OFFICE-2026-07-21";
const SOURCE = "standing-office-hours-ingest";
const TITLE = "Kelly Grappe – Secretary of State Campaign Office Hours";

/** Inclusive materialization window (America/Chicago calendar dates). */
const RANGE_START = "2026-07-22";
const RANGE_END = "2026-09-30";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: standing office ingest blocked on Netlify/production without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
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

function eachWeekday(startYmd, endYmd) {
  const out = [];
  const [ys, ms, ds] = startYmd.split("-").map(Number);
  const [ye, me, de] = endYmd.split("-").map(Number);
  const cur = new Date(Date.UTC(ys, ms - 1, ds));
  const end = new Date(Date.UTC(ye, me - 1, de));
  while (cur <= end) {
    const dow = cur.getUTCDay(); // 0 Sun … 6 Sat
    if (dow >= 1 && dow <= 5) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      out.push({
        ymd: `${y}-${m}-${d}`,
        weekday: dow,
        isTuesday: dow === 2,
      });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
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

const proof = {
  pass: PASS,
  range: { start: RANGE_START, end: RANGE_END },
  created: [],
  updated: [],
  skippedOverride: [],
  cancelledStanding: [],
};

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { archivedAt: null, privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
}

async function hasOverride(startsAt, endsAt) {
  const hits = await prisma.event.findMany({
    where: {
      archivedAt: null,
      status: { not: "CANCELLED" },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      NOT: { privateNotes: { contains: `[pass:${PASS}]` } },
    },
    select: { eventNumber: true, internalTitle: true, privateNotes: true },
    take: 5,
  });
  return hits.filter((h) => !h.privateNotes?.includes("[ingestKey:standing-office-"));
}

async function upsertBlock(actorUser, calendarId, spec) {
  const overrides = await hasOverride(spec.startsAt, spec.endsAt);
  const existing = await findByIngestKey(spec.key);

  if (overrides.length > 0) {
    if (existing && existing.status !== "CANCELLED") {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          privateNotes: `${existing.privateNotes}\n[SUPERSEDED:${PASS}] Mission/event override — office hours not applied.`,
          version: { increment: 1 },
        },
      });
      proof.cancelledStanding.push({
        key: spec.key,
        overriddenBy: overrides.map((o) => o.eventNumber),
      });
      console.log(`CANCEL standing (override): ${spec.key}`);
    } else {
      proof.skippedOverride.push({
        key: spec.key,
        overriddenBy: overrides.map((o) => o.eventNumber),
      });
      console.log(`SKIP (override): ${spec.key}`);
    }
    return;
  }

  const data = {
    internalTitle: TITLE,
    campaignDisplayTitle: TITLE,
    eventType: "Campaign Office Hours",
    status: "CONFIRMED",
    priority: "High",
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    timezone: "America/Chicago",
    city: spec.city,
    venueName: spec.venueName,
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: spec.privateNotes,
    primaryCalendarId: calendarId,
  };

  if (existing && existing.status !== "CANCELLED") {
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    proof.updated.push({ key: spec.key, eventNumber: updated.eventNumber });
    console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
    return;
  }

  if (existing?.status === "CANCELLED") {
    const revived = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, status: "CONFIRMED", version: { increment: 1 } },
    });
    proof.updated.push({ key: spec.key, eventNumber: revived.eventNumber, revived: true });
    console.log(`REVIVED: ${spec.key} → ${revived.eventNumber}`);
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const year = spec.startsAt.getFullYear();
    const eventNumber = await allocateEventNumber(tx, year);
    const event = await tx.event.create({
      data: {
        eventNumber,
        sourceType: "SYSTEM",
        createdByUserId: actorUser.id,
        ownerUserId: actorUser.id,
        ...data,
        version: 1,
      },
    });
    await tx.eventCalendarMembership.create({
      data: {
        eventId: event.id,
        calendarId,
        membershipType: "PRIMARY",
        isPrimary: true,
        createdByUserId: actorUser.id,
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: null,
        toStatus: "CONFIRMED",
        changedByUserId: actorUser.id,
        reason: `Standing office hours ${PASS}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorUser.id,
        actorType: "USER",
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: event.id,
        source: SOURCE,
        reason: `Standing office hours ${PASS}`,
        newStateRedacted: {
          eventNumber: event.eventNumber,
          ingestKey: spec.key,
          status: "CONFIRMED",
        },
      },
    });
    return event;
  });

  proof.created.push({ key: spec.key, eventNumber: created.eventNumber });
  console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
}

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "candidate", archivedAt: null },
  });
  if (!calendar) throw new Error("candidate calendar missing");

  const days = eachWeekday(RANGE_START, RANGE_END);
  console.log(`--- ${PASS} materialize ${days.length} weekdays ${RANGE_START}→${RANGE_END} ---`);

  for (const day of days) {
    const locLine = day.isTuesday
      ? "Location: Little Rock Campaign Office (Tuesday default)."
      : "Location: As Scheduled.";
    const amKey = `standing-office-am-${day.ymd}`;
    const pmKey = `standing-office-pm-${day.ymd}`;

    await upsertBlock(actorUser, calendar.id, {
      key: amKey,
      startsAt: chicagoLocalToDate(`${day.ymd}T08:00:00`),
      endsAt: chicagoLocalToDate(`${day.ymd}T12:00:00`),
      city: day.isTuesday ? "Little Rock" : null,
      venueName: day.isTuesday ? "Little Rock Campaign Office" : null,
      privateNotes: notes(
        amKey,
        [
          "STANDING: Morning Campaign Office Hours (Busy).",
          locLine,
          "Lunch 12:00–1:00 remains open unless separately scheduled.",
          "OVERRIDE: campaign missions/travel/events replace this block when overlapping.",
        ].join("\n"),
      ),
    });

    await upsertBlock(actorUser, calendar.id, {
      key: pmKey,
      startsAt: chicagoLocalToDate(`${day.ymd}T13:00:00`),
      endsAt: chicagoLocalToDate(`${day.ymd}T17:00:00`),
      city: day.isTuesday ? "Little Rock" : null,
      venueName: day.isTuesday ? "Little Rock Campaign Office" : null,
      privateNotes: notes(
        pmKey,
        [
          "STANDING: Afternoon Campaign Office Hours (Busy).",
          locLine,
          "OVERRIDE: campaign missions/travel/events replace this block when overlapping.",
        ].join("\n"),
      ),
    });
  }

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "standing-office-hours-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(
    `PASS: created=${proof.created.length} updated=${proof.updated.length} skipped=${proof.skippedOverride.length} cancelled=${proof.cancelledStanding.length}`,
  );
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
