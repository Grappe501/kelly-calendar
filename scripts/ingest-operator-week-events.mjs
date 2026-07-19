/**
 * Operator week live ingest (Feature Freeze compliant — no new UI).
 * Idempotent upsert by ingestKey in privateNotes. Never invents confirmed
 * clock times — TENTATIVE marks planning windows where only part of the
 * schedule was stated. Never prints secrets or street addresses.
 *
 * Usage:
 *   node scripts/run-with-h-drive-env.cjs node scripts/ingest-operator-week-events.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: operator live ingest blocked on Netlify/production deploy without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
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

function chicagoLocalToDate(localIso) {
  return new Date(`${localIso}-05:00`); // CDT Jul 2026
}

function notes(ingestKey, text) {
  return `[ingestKey:${ingestKey}]\n${text}`;
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

/**
 * Confirmed times from operator. TENTATIVE = planning window / partial evidence only.
 * Don Henry: 8:30–11 (operator). Internet 8–10 overlaps — kept as stated.
 * Picnic end Unknown → TENTATIVE window after 4:30 start.
 * Tue late return / Wed after-work depart / Sat morning parade / Sun night forum:
 *   planning windows only (labeled in notes).
 */
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
    privateNotes: notes(
      "fundraiser-cd2-2026-07-19",
      "Host: Judge Humphries home. Street address not stored. US House AR-02 fundraiser.",
    ),
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
    privateNotes: notes(
      "isp-window-2026-07-20",
      "New internet box install window 8:00–10:00 AM. Overlaps Don Henry block by operator choice.",
    ),
  },
  {
    key: "property-walk-2026-07-20",
    calendarSlug: "protected-personal",
    internalTitle: "Property walk / farm clean-up consult (Don Henry)",
    campaignDisplayTitle: "Personal — Property consult (Don Henry)",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T08:30:00"),
    endsAt: chicagoLocalToDate("2026-07-20T11:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    legacyTitles: ["Property walk / farm clean-up consult"],
    privateNotes: notes(
      "property-walk-2026-07-20",
      "Don Henry — walk property and set farm clean-up plan. Block 8:30–11:00 AM per operator.",
    ),
  },
  {
    key: "england-dems-kelly-2026-07-20",
    calendarSlug: "public-events",
    internalTitle: "Kelly speaks — England Democrat Meeting",
    campaignDisplayTitle: "England Democrat Meeting — Kelly speaks",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T17:30:00"),
    endsAt: chicagoLocalToDate("2026-07-20T19:00:00"),
    city: "England",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    privateNotes: notes(
      "england-dems-kelly-2026-07-20",
      "Kelly speaking. End time not separately confirmed — 7:00 PM planning end for calendar block.",
    ),
  },
  {
    key: "naacp-steve-jonesboro-2026-07-20",
    calendarSlug: "public-events",
    internalTitle: "Steve speaks — Jonesboro NAACP (Voter Registration & Deployment)",
    campaignDisplayTitle: "Jonesboro NAACP — Steve speaks",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T18:00:00"),
    endsAt: chicagoLocalToDate("2026-07-20T19:30:00"),
    city: "Jonesboro",
    venueName: "NAACP Jonesboro Branch",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "naacp-steve-jonesboro-2026-07-20",
      "Steve speaking 6:00 PM. Topic: Voter Registration & Deployment. End time not separately confirmed — 7:30 PM planning end.",
    ),
  },
  {
    key: "farm-depart-carroll-prep-2026-07-20",
    calendarSlug: "travel",
    internalTitle: "Meet at farm — depart prep for Carroll County",
    campaignDisplayTitle: "Travel prep — Carroll County (Tue)",
    eventType: "Travel block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T20:00:00"),
    endsAt: chicagoLocalToDate("2026-07-20T21:00:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "farm-depart-carroll-prep-2026-07-20",
      "Meet at the farm 8:00 PM. Travel preparation for Tuesday Carroll County Democrats Picnic.",
    ),
  },
  {
    key: "carroll-dems-picnic-2026-07-21",
    calendarSlug: "public-events",
    internalTitle: "Carroll County Democrats Picnic",
    campaignDisplayTitle: "Carroll County Democrats Picnic",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-21T16:30:00"),
    endsAt: chicagoLocalToDate("2026-07-21T20:00:00"),
    city: "Carroll County",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    privateNotes: notes(
      "carroll-dems-picnic-2026-07-21",
      "Start confirmed 4:30 PM CT. End time NOT confirmed — 8:00 PM is a planning placeholder only (TENTATIVE end semantics). Return to farm late evening (see travel return).",
    ),
  },
  {
    key: "return-farm-late-2026-07-21",
    calendarSlug: "travel",
    internalTitle: "Return to farm — late Tuesday (approximate)",
    campaignDisplayTitle: "Travel — return to farm (late)",
    eventType: "Travel block",
    status: "TENTATIVE",
    startsAt: chicagoLocalToDate("2026-07-21T21:00:00"),
    endsAt: chicagoLocalToDate("2026-07-21T23:30:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "return-farm-late-2026-07-21",
      "Operator: return to farm Tuesday night late. Exact clock times Unknown — planning window 9:00–11:30 PM only.",
    ),
  },
  {
    key: "depart-hsv-after-work-2026-07-22",
    calendarSlug: "travel",
    internalTitle: "Depart Little Rock for Hot Springs Village (after Kelly work)",
    campaignDisplayTitle: "Travel — LR to Hot Springs Village",
    eventType: "Travel block",
    status: "TENTATIVE",
    startsAt: chicagoLocalToDate("2026-07-22T17:00:00"),
    endsAt: chicagoLocalToDate("2026-07-22T20:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "depart-hsv-after-work-2026-07-22",
      "Leave after Kelly gets off work in Little Rock. Exact depart time Unknown — 5:00 PM planning start only. Lodging provided by Democrats Wed night.",
    ),
  },
  {
    key: "lodging-hsv-wed-2026-07-22",
    calendarSlug: "protected-personal",
    internalTitle: "Lodging — Hot Springs Village (Democrats · Wed night)",
    campaignDisplayTitle: "Personal — HSV lodging (Wed)",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-22T20:00:00"),
    endsAt: chicagoLocalToDate("2026-07-23T08:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "lodging-hsv-wed-2026-07-22",
      "Accommodations provided by Democrats Wednesday night. Address not stored.",
    ),
  },
  {
    key: "kelly-work-hsv-2026-07-23",
    calendarSlug: "staff-work",
    internalTitle: "Kelly work day — Hot Springs Village",
    campaignDisplayTitle: "Kelly work from Hot Springs Village",
    eventType: "Other",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-23T09:00:00"),
    endsAt: chicagoLocalToDate("2026-07-23T17:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "kelly-work-hsv-2026-07-23",
      "Kelly works from Hot Springs Village during the day Thursday. Exact hours not separately confirmed — standard day block.",
    ),
  },
  {
    key: "lodging-farm-thu-2026-07-23",
    calendarSlug: "protected-personal",
    internalTitle: "Lodging — farm (Thu night before Friday procedure)",
    campaignDisplayTitle: "Personal — farm overnight (Thu)",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-23T20:00:00"),
    endsAt: chicagoLocalToDate("2026-07-24T07:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "lodging-farm-thu-2026-07-23",
      "Operator itinerary: spend Thursday night at the farm (supersedes HSV Thu lodging for this night). Democrats also offered Thu night HSV — itinerary uses farm.",
    ),
  },
  {
    key: "steve-fasting-start-2026-07-23",
    calendarSlug: "protected-personal",
    internalTitle: "Steve medical prep — fasting starts (gastric bypass)",
    campaignDisplayTitle: "Personal — medical fasting starts",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-23T22:00:00"),
    endsAt: chicagoLocalToDate("2026-07-24T07:30:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "steve-fasting-start-2026-07-23",
      "Steve starts fasting for gastric bypass at 10:00 PM Thursday. Personal/medical — BUSY_ONLY.",
    ),
  },
  {
    key: "steve-procedure-2026-07-24",
    calendarSlug: "protected-personal",
    internalTitle: "Steve — gastric bypass procedure + ultrasound",
    campaignDisplayTitle: "Personal — medical procedure",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-24T07:30:00"),
    endsAt: chicagoLocalToDate("2026-07-24T12:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "steve-procedure-2026-07-24",
      "Procedure 7:30 AM Friday with ultrasound. End/recovery duration Unknown — noon planning end only. Facility address not stored.",
    ),
  },
  {
    key: "cave-city-watermelon-2026-07-25",
    calendarSlug: "public-events",
    internalTitle: "Cave City Watermelon Festival & Parade — volunteer activation",
    campaignDisplayTitle: "Cave City Watermelon Festival & Parade",
    eventType: "Festival",
    status: "TENTATIVE",
    startsAt: chicagoLocalToDate("2026-07-25T08:00:00"),
    endsAt: chicagoLocalToDate("2026-07-25T13:00:00"),
    city: "Cave City",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    relatedCalendarSlugs: ["volunteer"],
    privateNotes: notes(
      "cave-city-watermelon-2026-07-25",
      "Saturday morning festival/parade. Exact parade start Unknown — 8:00 AM–1:00 PM planning window. Ops: volunteers in t-shirts; circle frisbee fans; pepper parade route ahead with round fans/discs.",
    ),
  },
  {
    key: "lodging-batesville-sat-2026-07-25",
    calendarSlug: "protected-personal",
    internalTitle: "Lodging — Batesville (Sat night)",
    campaignDisplayTitle: "Personal — Batesville lodging",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-25T20:00:00"),
    endsAt: chicagoLocalToDate("2026-07-26T08:00:00"),
    city: "Batesville",
    locationDisclosure: "CITY",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "lodging-batesville-sat-2026-07-25",
      "Spend Saturday night in Batesville. Hotel address not stored.",
    ),
  },
  {
    key: "blytheville-churches-2026-07-26",
    calendarSlug: "public-events",
    internalTitle: "Blytheville — multiple church visits (Sunday morning)",
    campaignDisplayTitle: "Blytheville church visits",
    eventType: "Community meeting",
    status: "TENTATIVE",
    startsAt: chicagoLocalToDate("2026-07-26T09:00:00"),
    endsAt: chicagoLocalToDate("2026-07-26T12:30:00"),
    city: "Blytheville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    privateNotes: notes(
      "blytheville-churches-2026-07-26",
      "Multiple churches Sunday morning. Exact service times Unknown — morning planning window only.",
    ),
  },
  {
    key: "blytheville-forum-2026-07-26",
    calendarSlug: "public-events",
    internalTitle: "Blytheville candidate forum (Sunday night)",
    campaignDisplayTitle: "Blytheville candidate forum",
    eventType: "Candidate forum",
    status: "TENTATIVE",
    startsAt: chicagoLocalToDate("2026-07-26T18:00:00"),
    endsAt: chicagoLocalToDate("2026-07-26T20:30:00"),
    city: "Blytheville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    privateNotes: notes(
      "blytheville-forum-2026-07-26",
      "Candidate forum Sunday night. Exact start Unknown — 6:00–8:30 PM planning window only. Confirm with host.",
    ),
  },
];

const CALENDAR_SLUGS = [
  ...new Set([
    ...EVENTS.map((e) => e.calendarSlug),
    ...EVENTS.flatMap((e) => e.relatedCalendarSlugs ?? []),
  ]),
];

const proof = {
  generatedAt: new Date().toISOString(),
  scope: "enable_live_ingest_no_new_ui",
  featureFreeze: "honored",
  dates: ["2026-07-19", "2026-07-26"],
  timezone: "America/Chicago",
  honesty: "TENTATIVE marks planning windows where operator did not confirm exact clock times",
  events: [],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing after auth:seed");

  const calendars = await prisma.calendar.findMany({
    where: { slug: { in: CALENDAR_SLUGS }, archivedAt: null },
  });
  const bySlug = Object.fromEntries(calendars.map((c) => [c.slug, c]));
  for (const slug of CALENDAR_SLUGS) {
    if (!bySlug[slug]) throw new Error(`Calendar missing: ${slug}`);
  }

  for (const spec of EVENTS) {
    const calendar = bySlug[spec.calendarSlug];
    const keyTag = `[ingestKey:${spec.key}]`;
    let existing = await prisma.event.findFirst({
      where: {
        archivedAt: null,
        privateNotes: { startsWith: keyTag },
      },
    });
    if (!existing && spec.legacyTitles?.length) {
      existing = await prisma.event.findFirst({
        where: {
          archivedAt: null,
          primaryCalendarId: calendar.id,
          internalTitle: { in: spec.legacyTitles },
        },
      });
    }
    if (!existing) {
      existing = await prisma.event.findFirst({
        where: {
          archivedAt: null,
          primaryCalendarId: calendar.id,
          internalTitle: spec.internalTitle,
          startsAt: spec.startsAt,
        },
      });
    }

    if (existing) {
      const updated = await prisma.event.update({
        where: { id: existing.id },
        data: {
          internalTitle: spec.internalTitle,
          campaignDisplayTitle: spec.campaignDisplayTitle,
          restrictedDisplayTitle: spec.restrictedDisplayTitle ?? null,
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
          privateNotes: spec.privateNotes,
          primaryCalendarId: calendar.id,
          version: { increment: 1 },
        },
      });
      proof.events.push({
        key: spec.key,
        action: "updated",
        eventId: updated.id,
        eventNumber: updated.eventNumber,
        calendarSlug: spec.calendarSlug,
        status: updated.status,
      });
      console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
      continue;
    }

    const relatedIds = (spec.relatedCalendarSlugs ?? [])
      .map((s) => bySlug[s]?.id)
      .filter(Boolean);

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
          privateNotes: spec.privateNotes,
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
      for (const calendarId of relatedIds) {
        if (calendarId === calendar.id) continue;
        await tx.eventCalendarMembership.create({
          data: {
            eventId: event.id,
            calendarId,
            membershipType: "RELATED",
            isPrimary: false,
            createdByUserId: actorUser.id,
          },
        });
      }
      await tx.eventStatusHistory.create({
        data: {
          eventId: event.id,
          fromStatus: null,
          toStatus: event.status,
          changedByUserId: actorUser.id,
          reason: "Operator week ingest",
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

  const rangeStart = chicagoLocalToDate("2026-07-19T00:00:00");
  const rangeEnd = chicagoLocalToDate("2026-07-27T00:00:00");
  const listed = await prisma.event.findMany({
    where: {
      archivedAt: null,
      startsAt: { gte: rangeStart, lt: rangeEnd },
      privateNotes: { startsWith: "[ingestKey:" },
    },
    select: {
      eventNumber: true,
      internalTitle: true,
      status: true,
      startsAt: true,
      primaryCalendar: { select: { slug: true } },
    },
    orderBy: { startsAt: "asc" },
  });
  proof.ingestVerifyCount = listed.length;
  proof.ingestVerify = listed.map((e) => ({
    eventNumber: e.eventNumber,
    calendarSlug: e.primaryCalendar.slug,
    status: e.status,
    startsAt: e.startsAt.toISOString(),
    title: e.internalTitle,
  }));

  const proofsDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(proofsDir, { recursive: true });
  const outPath = path.join(proofsDir, "operator-week-ingest-latest.json");
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(`PASS: ingest-tagged events in range: ${listed.length}`);
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
