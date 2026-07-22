/**
 * Fall operator batch (Sep 27 – Nov 3, 2026)
 * Little Flock · Hot Springs forum · Goat + Moonshine · Baxter travel ·
 * Oct 10 triple conflict · Saline · Stuttgart/Flatrock · milestones · Car Show
 *
 * Usage: npm run events:ingest:fall-operator-batch
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "FALL-OPERATOR-BATCH-2026";
const GOAT_KEY = "goat-festival-perryville-2026-10-03";
const BAXTER_KEY = "baxter-farm-bureau-2026-10-06";

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
  // America/Chicago: CDT (UTC-5) until first Sunday in Nov 2026 (Nov 1); CST (UTC-6) after.
  const day = localIso.slice(0, 10);
  const offset = day >= "2026-11-01" ? "-06:00" : "-05:00";
  return new Date(`${localIso}${offset}`);
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

let actorUser;
const calendarCache = new Map();

async function calendarBySlug(slug) {
  if (calendarCache.has(slug)) return calendarCache.get(slug);
  const calendar = await prisma.calendar.findFirst({
    where: { slug, archivedAt: null },
  });
  if (!calendar) throw new Error(`Calendar missing: ${slug}`);
  calendarCache.set(slug, calendar);
  return calendar;
}

async function upsertEvent({ key, calendarSlug, createStatus, source, data }) {
  const calendar = await calendarBySlug(calendarSlug);
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

const SPECS = [
  // ── Sep 27 Little Flock ────────────────────────────────────────────
  {
    key: "travel-bentonville-little-flock-2026-09-27",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Bentonville (Little Flock picnic)",
      campaignDisplayTitle: "Travel to Bentonville",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-27T07:00:00"),
      endsAt: chicagoLocalToDate("2026-09-27T11:00:00"),
      city: "Bentonville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-bentonville-little-flock-2026-09-27",
        [
          "SOURCE: Operator — travel up Sunday morning to Bentonville for Benton County Little Flock picnic.",
          "SUPPORT for little-flock-picnic-2026-09-27.",
          "Soft morning window 7:00–11:00 CT.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "little-flock-picnic-2026-09-27",
    calendarSlug: "county-activity",
    createStatus: "HOLD",
    data: {
      internalTitle: "Benton County Little Flock Picnic",
      campaignDisplayTitle: "Little Flock Picnic (Benton County)",
      eventType: "Community Picnic / County Outreach",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-27T11:00:00"),
      endsAt: chicagoLocalToDate("2026-09-27T15:00:00"),
      city: "Little Flock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "little-flock-picnic-2026-09-27",
        [
          "SOURCE: Operator — Benton County Little Flock picnic Sunday Sep 27.",
          "ARRIVAL: travel-bentonville-little-flock-2026-09-27 (Sunday morning to Bentonville).",
          "Exact picnic clock/venue soft 11:00–3:00 until locked — do not invent address.",
          "Continuity with NWA / Benton immersion relationships.",
        ].join("\n"),
      ),
    },
  },

  // ── Sep 29 Hot Springs forum ───────────────────────────────────────
  {
    key: "hot-springs-candidate-forum-2026-09-29",
    calendarSlug: "public-events",
    createStatus: "HOLD",
    data: {
      internalTitle: "Candidate Forum – Hot Springs",
      campaignDisplayTitle: "Hot Springs Candidate Forum",
      eventType: "Campaign Candidate Forum / Speaking Engagement",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-29T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-29T23:59:00"),
      isAllDay: true,
      city: "Hot Springs",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "hot-springs-candidate-forum-2026-09-29",
        [
          "SOURCE: Operator — Candidate forum in Hot Springs. All day blocked pending details.",
          "Venue / clock / role TBD — do not invent.",
          "Distinct from hsv-candidate-forum-2026-09-16 (Hot Springs Village).",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 3 Van Buren Moonshine (Goat updated separately) ────────────
  {
    key: "van-buren-moonshine-music-2026-10-03",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Van Buren County Moonshine and Music Festival",
      campaignDisplayTitle: "Moonshine & Music Festival (Van Buren Co.)",
      eventType: "Community Festival / Field Outreach",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-03T13:00:00"),
      endsAt: chicagoLocalToDate("2026-10-03T18:00:00"),
      city: "Clinton",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "van-buren-moonshine-music-2026-10-03",
        [
          "SOURCE: Operator — afternoon Oct 3 Van Buren County Moonshine and Music festival.",
          "SAME DAY AM: goat-festival-perryville-2026-10-03 (9:00 AM–12:00 PM Perryville).",
          "City default Clinton (county seat) until venue locked — do not invent address.",
          "Soft afternoon 1:00–6:00 CT. Travel Perryville → Van Buren Co. after noon.",
          "NAVIGATION: same-day double festival — confirm drive time / leave Perryville by ~12:15.",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 5 voter reg end + Baxter travel ────────────────────────────
  {
    key: "milestone-voter-registration-ends-2026-10-05",
    calendarSlug: "compliance",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "End of Voter Registration (Arkansas)",
      campaignDisplayTitle: "Voter Registration Ends",
      eventType: "Campaign Milestone / Compliance",
      status: "CONFIRMED",
      priority: "Critical",
      startsAt: chicagoLocalToDate("2026-10-05T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-05T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "HIDDEN",
      defaultVisibility: "TITLE_LOCATION",
      privateNotes: notes(
        "milestone-voter-registration-ends-2026-10-05",
        [
          "SOURCE: Operator — Oct 5 end of voter registration.",
          "Milestone / compliance day — confirm official SOS deadline clock against state notice before public claims.",
          "SAME DAY: travel-mountain-home-baxter-2026-10-05 for Baxter forum Oct 6.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "travel-mountain-home-baxter-2026-10-05",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Mountain Home (Baxter Farm Bureau)",
      campaignDisplayTitle: "Travel to Mountain Home",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-05T16:00:00"),
      endsAt: chicagoLocalToDate("2026-10-05T20:00:00"),
      city: "Mountain Home",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-mountain-home-baxter-2026-10-05",
        [
          "SOURCE: Operator — travel up the day before Baxter County Farm Bureau Candidates Forum.",
          "SUPPORT for lodging-mountain-home-2026-10-05 + baxter-farm-bureau-2026-10-06.",
          "Soft afternoon/evening window 4:00–8:00 CT.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "lodging-mountain-home-2026-10-05",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Overnight lodging – Mountain Home",
      campaignDisplayTitle: "Overnight – Mountain Home",
      eventType: "Travel / Lodging",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-05T20:00:00"),
      endsAt: chicagoLocalToDate("2026-10-06T16:00:00"),
      city: "Mountain Home",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "lodging-mountain-home-2026-10-05",
        [
          "SUPPORT for baxter-farm-bureau-2026-10-06 (6:00 PM forum).",
          "Property TBD — do not invent.",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 10 triple conflict day ─────────────────────────────────────
  {
    key: "decision-oct10-triple-conflict-2026-10-10",
    calendarSlug: "candidate",
    createStatus: "HOLD",
    data: {
      internalTitle: "DECISION: Oct 10 triple conflict navigation",
      campaignDisplayTitle: "DECISION NEEDED — Oct 10 three events",
      eventType: "Operator Decision / Conflict",
      status: "HOLD",
      priority: "Critical",
      startsAt: chicagoLocalToDate("2026-10-10T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-10T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "HIDDEN",
      defaultVisibility: "TITLE_LOCATION",
      privateNotes: notes(
        "decision-oct10-triple-conflict-2026-10-10",
        [
          "SOURCE: Operator — Saturday Oct 10 has THREE competing events; must determine how to navigate.",
          "A: montgomery-county-event-2026-10-10",
          "B: turkey-drop-yellville-2026-10-10 (Marion County)",
          "C: saline-old-fashioned-days-2026-10-10",
          "Do NOT auto-pick. Options: split surrogates, AM/PM split if geography allows, or cancel/defer two.",
          "Geography: Montgomery (SW) vs Yellville (N) vs Saline (Central) — same-day all three is not realistic for Kelly alone.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "montgomery-county-event-2026-10-10",
    calendarSlug: "county-activity",
    createStatus: "HOLD",
    data: {
      internalTitle: "Montgomery County Event",
      campaignDisplayTitle: "Montgomery County Event",
      eventType: "County Activity / Program TBD",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-10T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-10T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "montgomery-county-event-2026-10-10",
        [
          "SOURCE: Operator — Montgomery County Event Sat Oct 10.",
          "Program/venue/clock TBD.",
          "TRIPLE CONFLICT: turkey-drop-yellville-2026-10-10 + saline-old-fashioned-days-2026-10-10 — see decision-oct10-triple-conflict-2026-10-10.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "turkey-drop-yellville-2026-10-10",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Turkey Drop – Yellville",
      campaignDisplayTitle: "Turkey Drop (Yellville)",
      eventType: "Community Festival / Field Outreach",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-10T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-10T23:59:00"),
      isAllDay: true,
      city: "Yellville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "turkey-drop-yellville-2026-10-10",
        [
          "SOURCE: Operator — Turkey Drop in Yellville Sat Oct 10 (typed Turkey Drpo).",
          "Clock/venue TBD.",
          "TRIPLE CONFLICT with Montgomery + Saline Old Fashioned Days — see decision-oct10-triple-conflict-2026-10-10.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "saline-old-fashioned-days-2026-10-10",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Saline County Old Fashioned Days",
      campaignDisplayTitle: "Saline County Old Fashioned Days",
      eventType: "Community Festival / Field Outreach",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-10T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-10T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "saline-old-fashioned-days-2026-10-10",
        [
          "SOURCE: Operator — Saline County Old Fashioned Days Sat Oct 10.",
          "City/venue TBD (Benton / county festival site) — do not invent.",
          "TRIPLE CONFLICT with Montgomery + Yellville Turkey Drop — see decision-oct10-triple-conflict-2026-10-10.",
          "RELATED: saline-county-2026-10-12 (Mon follow-up window).",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 12 Saline ──────────────────────────────────────────────────
  {
    key: "saline-county-2026-10-12",
    calendarSlug: "county-activity",
    createStatus: "HOLD",
    data: {
      internalTitle: "Saline County (program TBD)",
      campaignDisplayTitle: "Saline County",
      eventType: "County Activity / Program TBD",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-12T10:00:00"),
      endsAt: chicagoLocalToDate("2026-10-12T12:00:00"),
      city: "Benton",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "saline-county-2026-10-12",
        [
          "SOURCE: Operator — Oct 12 10:00 AM–12:00 PM Saline County.",
          "Program/venue TBD. City default Benton (county seat) until locked.",
          "May relate to saline-old-fashioned-days-2026-10-10 decision outcome.",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 17 Stuttgart + Flatrock (Saturday between Oct 12 and early vote)
  {
    key: "stuttgart-event-2026-10-17",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Stuttgart event",
      campaignDisplayTitle: "Stuttgart",
      eventType: "County / Community Event",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-17T10:00:00"),
      endsAt: chicagoLocalToDate("2026-10-17T13:00:00"),
      city: "Stuttgart",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "stuttgart-event-2026-10-17",
        [
          "SOURCE: Operator — Saturday 10:00 AM–1:00 PM Stuttgart (date assumed Oct 17 = Saturday between Oct 12 and early voting Oct 19).",
          "CONFIRM date if operator meant a different Saturday.",
          "Program/venue TBD. SAME DAY PM: flatrock-fish-fry-2026-10-17.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "flatrock-fish-fry-2026-10-17",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Flatrock HWY 359 Fire Dept #5 Fish Fry",
      campaignDisplayTitle: "Flatrock Fire Dept #5 Fish Fry",
      eventType: "Community Fish Fry / Field Outreach",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-10-17T17:00:00"),
      endsAt: chicagoLocalToDate("2026-10-17T20:00:00"),
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "flatrock-fish-fry-2026-10-17",
        [
          "SOURCE: Operator — Flatrock HWY 359 Fire Dept #5 fish fry.",
          "TIME: Operator typed “%pm” — placeholder 5:00–8:00 PM until confirmed.",
          "DATE: Assumed Sat Oct 17 with Stuttgart AM — confirm.",
          "Exact site along HWY 359 TBD — do not invent street address.",
          "SAME DAY AM: stuttgart-event-2026-10-17.",
        ].join("\n"),
      ),
    },
  },

  // ── Oct 19 early voting ────────────────────────────────────────────
  {
    key: "milestone-early-voting-begins-2026-10-19",
    calendarSlug: "compliance",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Early Voting Begins (Arkansas)",
      campaignDisplayTitle: "Early Voting Begins",
      eventType: "Campaign Milestone / Compliance",
      status: "CONFIRMED",
      priority: "Critical",
      startsAt: chicagoLocalToDate("2026-10-19T00:00:00"),
      endsAt: chicagoLocalToDate("2026-10-19T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "HIDDEN",
      defaultVisibility: "TITLE_LOCATION",
      privateNotes: notes(
        "milestone-early-voting-begins-2026-10-19",
        [
          "SOURCE: Operator — October 19 early voting begins.",
          "Confirm official county early-vote sites/hours before public claims.",
          "Field posture shifts to GOTV / early-vote turnout from this date.",
        ].join("\n"),
      ),
    },
  },

  // ── Nov 1 Car Show ─────────────────────────────────────────────────
  {
    key: "central-ar-car-show-parade-2026-11-01",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Central Arkansas Car Show and Parade",
      campaignDisplayTitle: "Central Arkansas Car Show & Parade",
      eventType: "Community Festival / Parade",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-11-01T06:30:00"),
      endsAt: chicagoLocalToDate("2026-11-01T10:30:00"),
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "central-ar-car-show-parade-2026-11-01",
        [
          "SOURCE: Operator — Nov 1 Central Arkansas Car Show and Parade 6:30–10:30 AM.",
          "City/venue TBD (Central Arkansas) — do not invent.",
          "Two days before Election Day — GOTV / visibility opportunity.",
        ].join("\n"),
      ),
    },
  },

  // ── Nov 3 Election Day ─────────────────────────────────────────────
  {
    key: "milestone-election-day-2026-11-03",
    calendarSlug: "compliance",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Election Day 2026",
      campaignDisplayTitle: "Election Day",
      eventType: "Campaign Milestone / Election Day",
      status: "CONFIRMED",
      priority: "Critical",
      startsAt: chicagoLocalToDate("2026-11-03T00:00:00"),
      endsAt: chicagoLocalToDate("2026-11-03T23:59:00"),
      isAllDay: true,
      state: "Arkansas",
      locationDisclosure: "HIDDEN",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "milestone-election-day-2026-11-03",
        [
          "SOURCE: Operator — November 3 Election Day.",
          "Polls / GOTV / election-night plan TBD in separate ops doc.",
          "Prior: central-ar-car-show-parade-2026-11-01 (Sun).",
        ].join("\n"),
      ),
    },
  },
];

const proof = {
  pass: PASS,
  events: [],
  updates: [],
  conflictsSurfaced: [
    "Oct 10: Montgomery ∩ Yellville Turkey Drop ∩ Saline Old Fashioned Days",
    "Oct 3: Goat Festival AM ∩ Van Buren Moonshine & Music PM (drive required)",
    "Oct 17 assumed for Stuttgart + Flatrock (operator omitted date)",
  ],
  openDecisions: [
    "Navigate Oct 10 three-way geography (Kelly cannot cover all three alone).",
    "Confirm Flatrock fish fry clock (typed %pm) and Saturday date (assumed Oct 17).",
    "Confirm Little Flock picnic exact venue/time.",
    "Confirm Hot Springs Sep 29 forum details.",
  ],
};

try {
  actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  for (const spec of SPECS) {
    const event = await upsertEvent({
      ...spec,
      source: "fall-operator-batch-ingest",
    });
    proof.events.push({
      key: spec.key,
      eventNumber: event.eventNumber,
      status: event.status,
    });
  }

  // Update Goat Festival → 9am–noon; afternoon is Van Buren.
  const goat = await findByIngestKey(GOAT_KEY);
  if (goat) {
    const updated = await prisma.event.update({
      where: { id: goat.id },
      data: {
        startsAt: chicagoLocalToDate("2026-10-03T09:00:00"),
        endsAt: chicagoLocalToDate("2026-10-03T12:00:00"),
        privateNotes: notes(
          GOAT_KEY,
          [
            "SOURCE: Operator update — Perryville Goat Festival 9:00 AM–12:00 PM Oct 3 (was 10–4).",
            "COUNTY: Perry County. City: Perryville. INFO: arkansasgoatfestival.com",
            "SAME DAY PM: van-buren-moonshine-music-2026-10-03 — leave by ~noon for Van Buren County.",
            "TYPE: Community festival / regional outreach.",
          ].join("\n"),
        ),
        version: { increment: 1 },
      },
    });
    proof.updates.push({
      key: GOAT_KEY,
      eventNumber: updated.eventNumber,
      change: "hours → 09:00–12:00",
    });
    console.log(`UPDATED: ${GOAT_KEY} → ${updated.eventNumber} (9am–noon)`);
  } else {
    console.warn(`WARN: missing ${GOAT_KEY}`);
  }

  // Update Baxter to 6pm start emphasis + link travel.
  const baxter = await findByIngestKey(BAXTER_KEY);
  if (baxter) {
    const updated = await prisma.event.update({
      where: { id: baxter.id },
      data: {
        startsAt: chicagoLocalToDate("2026-10-06T18:00:00"),
        endsAt: chicagoLocalToDate("2026-10-06T21:00:00"),
        privateNotes: notes(
          BAXTER_KEY,
          [
            "SOURCE: Operator — Baxter County Farm Bureau Candidates Forum 6:00 PM Mountain Home.",
            "Venue: Baxter County Fairgrounds (prior record). Arrive ~5:00 if doors allow.",
            "ARRIVAL: travel-mountain-home-baxter-2026-10-05 + lodging-mountain-home-2026-10-05.",
            "RSVP accepted (prior). CONTACT: Elliott Golmon — CRM only.",
            "Kelly is Farm Bureau member — use in intro if appropriate.",
          ].join("\n"),
        ),
        version: { increment: 1 },
      },
    });
    proof.updates.push({
      key: BAXTER_KEY,
      eventNumber: updated.eventNumber,
      change: "6:00–9:00 PM + travel day before",
    });
    console.log(`UPDATED: ${BAXTER_KEY} → ${updated.eventNumber}`);
  } else {
    console.warn(`WARN: missing ${BAXTER_KEY}`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "fall-operator-batch-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(`CREATED/UPSERTED: ${proof.events.length}; UPDATED: ${proof.updates.length}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
