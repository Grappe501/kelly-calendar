/**
 * Schedule corrections after Greene County / Miller-Texarkana operator decision.
 * Pass: OBS-CORR-2026-07-21
 *
 * - Miller/Texarkana: Sat night–Sun only; LR overnight Sun; Mon = LR office
 * - Greene: Mon eve travel → Tue immersion → Wed Rotary/evening → home Wed night
 * - Aug 8 Terri fundraiser (conflicts Hope)
 * - Sep 26 Greene County Community Forum (date only)
 *
 * Usage: npm run events:ingest:observation-corrections
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "OBS-CORR-2026-07-21";
const SOURCE = "observation-corrections-ingest";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: corrections ingest blocked on Netlify/production without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
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

const proof = {
  pass: PASS,
  created: [],
  updated: [],
  cancelled: [],
};

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
}

async function cancelKey(actorUser, key, reason) {
  const existing = await findByIngestKey(key);
  if (!existing || existing.status === "CANCELLED") {
    proof.cancelled.push({ key, action: existing ? "already_cancelled" : "absent" });
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        privateNotes: `${existing.privateNotes}\n[SUPERSEDED:${PASS}]\n${reason}`,
        version: { increment: 1 },
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: existing.id,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        changedByUserId: actorUser.id,
        reason,
      },
    });
  });
  proof.cancelled.push({ key, action: "cancelled", eventNumber: existing.eventNumber });
  console.log(`CANCELLED: ${key}`);
}

async function upsertLive(actorUser, bySlug, spec) {
  const calendar = bySlug[spec.calendarSlug];
  if (!calendar) throw new Error(`Calendar missing: ${spec.calendarSlug}`);
  const existing = await findByIngestKey(spec.key);

  const data = {
    internalTitle: spec.internalTitle,
    campaignDisplayTitle: spec.campaignDisplayTitle,
    restrictedDisplayTitle: spec.restrictedDisplayTitle ?? null,
    eventType: spec.eventType,
    status: spec.status,
    priority: spec.priority ?? "Normal",
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    isAllDay: Boolean(spec.isAllDay),
    isMultiDay: Boolean(spec.isMultiDay),
    timezone: "America/Chicago",
    city: spec.city ?? null,
    venueName: spec.venueName ?? null,
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
    proof.updated.push({ key: spec.key, eventNumber: updated.eventNumber, status: updated.status });
    console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
    return;
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
        reason: `Corrections ingest ${PASS}`,
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
        reason: `Corrections ${PASS}`,
        newStateRedacted: {
          eventNumber: event.eventNumber,
          ingestKey: spec.key,
          status: event.status,
        },
      },
    });
    return event;
  });
  proof.created.push({ key: spec.key, eventNumber: created.eventNumber, status: created.status });
  console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
}

const LIVE_EVENTS = [
  // Miller / Texarkana: Sat night–Sun only
  {
    key: "miller-immersion-2026-08-23",
    calendarSlug: "county-activity",
    internalTitle: "Miller County / Texarkana Immersion",
    campaignDisplayTitle: "Miller County / Texarkana Immersion",
    eventType: "County Immersion / Relationship Building",
    status: "HOLD",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-08-23T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-23T20:00:00"),
    city: "Fouke",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "miller-immersion-2026-08-23",
      [
        "CORRECTED: Sat night (Aug 22) through Sunday only — not Mon Aug 24.",
        "Sun: church with Becky + Miller immersion. Sun night: Little Rock (lodging-littlerock-2026-08-23).",
        "Mon Aug 24: Little Rock Campaign Office day (last-Tuesday week exception), then travel to Paragould.",
        "Host lodging Sat: Becky (Fouke). Contact details in CRM only.",
      ].join("\n"),
    ),
  },
  {
    key: "lodging-littlerock-2026-08-23",
    calendarSlug: "travel",
    internalTitle: "Overnight Stay – Little Rock (after Miller/Texarkana)",
    campaignDisplayTitle: "Overnight – Little Rock",
    eventType: "Travel / Lodging",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-23T20:00:00"),
    endsAt: chicagoLocalToDate("2026-08-24T08:00:00"),
    city: "Little Rock",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "lodging-littlerock-2026-08-23",
      "CORRECTED: Sunday night LR after Miller/Texarkana Sunday immersion. Positions Mon LR office day before Greene County travel.",
    ),
  },

  // Greene County Mon eve → Wed night
  {
    key: "travel-paragould-2026-08-24",
    calendarSlug: "travel",
    internalTitle: "Travel Little Rock → Paragould (Greene County)",
    campaignDisplayTitle: "Travel to Paragould",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-24T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-24T20:30:00"),
    city: "Paragould",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-paragould-2026-08-24",
      [
        "After Mon LR office day (last-Tuesday week: office shifted to Monday).",
        "Arrive ~8:00 PM. Evening: lodging + host meet only — no public event.",
        "Parent: greene-immersion-2026-08-25.",
        "FULFILLMENT: Greene organizer requested Kelly Grappe yard sign — deliver on this trip.",
      ].join("\n"),
    ),
  },
  {
    key: "greene-immersion-2026-08-25",
    calendarSlug: "county-activity",
    internalTitle: "Greene County Immersion – Paragould",
    campaignDisplayTitle: "Greene County Immersion",
    eventType: "County Immersion / Relationship Building",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-25T08:00:00"),
    endsAt: chicagoLocalToDate("2026-08-25T17:00:00"),
    city: "Paragould",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "greene-immersion-2026-08-25",
      [
        "Tier 1. Full Tuesday field day (LR office moved to Monday this week).",
        "AM: coffee/leaders, businesses, courthouse, listening, volunteers.",
        "Noon: civic lunch TBD 11:45–1:00 (awaiting confirmation).",
        "PM: businesses, orgs, media, foster-care discussions (future standalone preferred), retirement-community planning, yard-sign delivery.",
        "Evening community event is Wed — greene-evening-community-2026-08-26.",
        "Do NOT stay through Thu — clark-county-meeting-arkadelphia-2026-08-27.",
        "TASK: Fulfill yard-sign request for Greene organizer.",
      ].join("\n"),
    ),
  },
  {
    key: "greene-rotary-2026-08-26",
    calendarSlug: "public-events",
    internalTitle: "Rotary Club Lunch – Paragould / Greene County",
    campaignDisplayTitle: "Rotary Club – Greene County",
    eventType: "Civic Club Speaking Engagement",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-26T11:45:00"),
    endsAt: chicagoLocalToDate("2026-08-26T13:00:00"),
    city: "Paragould",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    candidateAttendance: true,
    privateNotes: notes(
      "greene-rotary-2026-08-26",
      "Awaiting final confirmation / venue. Short intro, remarks, Q&A, relationship follow-up. Parent immersion: greene-immersion-2026-08-25.",
    ),
  },
  {
    key: "greene-evening-community-2026-08-26",
    calendarSlug: "public-events",
    internalTitle: "Greene County Senior Community Social & Voter-Access Night",
    campaignDisplayTitle: "Greene County Senior Community Social",
    eventType: "Community Outreach / Civic Engagement",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-26T17:30:00"),
    endsAt: chicagoLocalToDate("2026-08-26T19:00:00"),
    city: "Paragould",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "greene-evening-community-2026-08-26",
      [
        "Preferred Wed evening concept — facility approval + compliance review required before Confirm.",
        "Format: informal social; bingo caller; donated prizes; brief remarks; voter-registration STATUS info via official resources only; transport/access discussion; volunteer signup.",
        "GUARDRAIL: Do not imply campaign controls voter registration. Separate assistance from persuasion.",
        "City-owned nursing home: only if facility approves and equal-access/public-property review clears.",
        "Foster-care gathering: defer to later standalone mission (service-first hook).",
        "Then return Rose Bud — travel-rosebud-2026-08-26.",
      ].join("\n"),
    ),
  },
  {
    key: "travel-rosebud-2026-08-26",
    calendarSlug: "travel",
    internalTitle: "Travel home – Rose Bud (after Greene County)",
    campaignDisplayTitle: "Travel home – Rose Bud",
    eventType: "Travel / Return Home",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-26T19:15:00"),
    endsAt: chicagoLocalToDate("2026-08-26T22:30:00"),
    city: "Rose Bud",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-rosebud-2026-08-26",
      "After greene-evening-community-2026-08-26. Preserves Thu Aug 27 Arkadelphia / Clark County meeting.",
    ),
  },

  // Aug 8 Terri fundraiser conflict
  {
    key: "fundraiser-terri-2026-08-08",
    calendarSlug: "fundraising",
    internalTitle: "Fundraiser for Terri",
    campaignDisplayTitle: "Fundraiser for Terri",
    eventType: "Campaign Fundraiser",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-08T11:00:00"),
    endsAt: chicagoLocalToDate("2026-08-08T15:00:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "fundraiser-terri-2026-08-08",
      [
        "Table setup 11:00–11:45 · Event 12:00–3:00. Special guests; ~10 min speaking; campaign table; attendance goal ~150.",
        "DATA QUALITY CONFLICT: Same day as hope-watermelon-festival-2026-08-08 and clinton-day-dinner-2026-08-08.",
        "Operator must choose attendance — do not auto-resolve.",
      ].join("\n"),
    ),
  },

  // Sep 26 Greene forum
  {
    key: "greene-community-forum-2026-09-26",
    calendarSlug: "public-events",
    internalTitle: "Greene County Community Forum",
    campaignDisplayTitle: "Greene County Community Forum",
    eventType: "Community Forum",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-09-26T10:00:00"),
    endsAt: chicagoLocalToDate("2026-09-26T12:00:00"),
    city: "Paragould",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "greene-community-forum-2026-09-26",
      "Date confirmed. Program, venue, time, participants, and Kelly role TBD. Placeholder 10–12 until details land.",
    ),
  },
];

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing");

  const slugs = [...new Set(LIVE_EVENTS.map((e) => e.calendarSlug))];
  const calendars = await prisma.calendar.findMany({
    where: { slug: { in: slugs }, archivedAt: null },
  });
  const bySlug = Object.fromEntries(calendars.map((c) => [c.slug, c]));
  for (const slug of slugs) {
    if (!bySlug[slug]) throw new Error(`Calendar missing: ${slug}`);
  }

  console.log(`--- ${PASS} supersede obsolete lodging ---`);
  await cancelKey(
    actorUser,
    "lodging-littlerock-2026-08-24",
    "Superseded: LR overnight moved to Sunday Aug 23 after Miller/Texarkana; Mon Aug 24 is LR office then Paragould travel.",
  );

  console.log(`--- ${PASS} upserts (${LIVE_EVENTS.length}) ---`);
  for (const spec of LIVE_EVENTS) {
    await upsertLive(actorUser, bySlug, spec);
  }

  // Patch Hope conflict note to include Terri
  const hope = await findByIngestKey("hope-watermelon-festival-2026-08-08");
  if (hope && !hope.privateNotes?.includes("fundraiser-terri-2026-08-08")) {
    await prisma.event.update({
      where: { id: hope.id },
      data: {
        privateNotes: `${hope.privateNotes}\n[${PASS}] Also conflicts with fundraiser-terri-2026-08-08 (12:00–3:00).`,
        version: { increment: 1 },
      },
    });
    console.log("PATCHED: hope-watermelon conflict note");
  }

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "observation-corrections-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(
    `PASS: created=${proof.created.length} updated=${proof.updated.length} cancelled=${proof.cancelled.length}`,
  );
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
