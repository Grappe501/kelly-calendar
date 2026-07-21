/**
 * KCCC Observation Pass ingest — operator briefs → live calendar + planning drafts
 *
 * Scope: Hot Springs (Jul 23) through late August 2026 mission set from observation session.
 * - Idempotent upsert by [ingestKey:…] in privateNotes
 * - No phones/emails/street addresses in this file (names/roles only)
 * - Conflicts surfaced in notes, not auto-resolved (Doctrine #1)
 * - Undated work → EventPlanningDraft rows (Postgres), not fake calendar days
 *
 * Usage: npm run events:ingest:observation-pass
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "OBS-2026-07-21";
const SOURCE = "observation-pass-ingest";

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
  if (r.status !== 0) {
    console.error(`FAIL: ${script} exited ${r.status}`);
    process.exit(r.status ?? 1);
  }
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

/**
 * Live / Hold / Tentative calendar rows.
 * Travel & lodging are TRAVEL calendar; personal medical = protected-personal BUSY_ONLY.
 */
const LIVE_EVENTS = [
  // ── July 23 Hot Springs ───────────────────────────────────────────
  {
    key: "hsv-dems-road-to-blue-2026-07-23",
    calendarSlug: "public-events",
    internalTitle: "Hot Springs Village Democratic Club – Road to Blue Dinner",
    campaignDisplayTitle: "Hot Springs Village Democratic Club – Road to Blue Dinner",
    eventType: "Campaign Speaking Engagement",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-07-23T15:00:00"),
    endsAt: chicagoLocalToDate("2026-07-23T19:00:00"),
    city: "Hot Springs Village",
    venueName: "Hot Springs Village Democratic Club",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    candidateAttendance: true,
    privateNotes: notes(
      "hsv-dems-road-to-blue-2026-07-23",
      [
        "MISSION: Speaking + relationship dinner.",
        "OBJECTIVE: Introduce SOS campaign; ~7 min remarks; materials table; networking.",
        "SCHEDULE: Social 3–4 · Dinner 4–5 · Speaking ~4:15–5:15 · Close ~6:30–7:00. Arrive ~2:45.",
        "HOST: Deb Bryan (President, HSV Democratic Club). Contact details in operator CRM only — not stored here.",
        "LODGING: Overnight Jul 22 with host (Lake Desoto residence). Offer accepted.",
        "WORK BLOCK: Morning Jul 23 remote from host home (quiet workspace / internet) — PTO conservation.",
        "PREP: 7-min remarks; SOS priorities; signs; merch; literature; phone/camera/charger.",
        "FOLLOW-UP: Thank-you card; photos; contacts; volunteer/donor commitments.",
        "PARENT SWING: Northeast Arkansas / HSV overnight support.",
      ].join("\n"),
    ),
  },
  {
    key: "lodging-hsv-host-2026-07-22",
    calendarSlug: "travel",
    internalTitle: "Overnight lodging – Hot Springs Village (host)",
    campaignDisplayTitle: "Overnight – Hot Springs Village",
    eventType: "Travel / Lodging",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-07-22T18:00:00"),
    endsAt: chicagoLocalToDate("2026-07-23T14:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "lodging-hsv-host-2026-07-22",
      "SUPPORT for hsv-dems-road-to-blue-2026-07-23. Host lodging (Deb Bryan). Street address not stored in git. Morning work block before 2:45 campaign arrival.",
    ),
  },

  // ── Cave City Watermelon Festival weekend ─────────────────────────
  {
    key: "cave-city-watermelon-festival-2026-07-24",
    calendarSlug: "field",
    internalTitle: "Cave City Watermelon Festival 2026",
    campaignDisplayTitle: "Cave City Watermelon Festival",
    eventType: "Community Festival / Field Outreach",
    status: "HOLD",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-07-24T12:00:00"),
    endsAt: chicagoLocalToDate("2026-07-25T21:00:00"),
    city: "Cave City",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "cave-city-watermelon-festival-2026-07-24",
      [
        "MISSION TYPE: Tier 1 Community Outreach / Field Mission (umbrella).",
        "OBJECTIVE: NE Arkansas visibility; voter contact; officials; businesses; volunteers; photos.",
        "FRI: Travel, walk grounds, vendors, evening networking.",
        "SAT: Setup ~8:30 · Parade 10:00 (optional) · High contact noon–4 · Feast 4:00 · Auction 5:00 · evening concerts.",
        "Festival activities are OPTIONAL opportunities — maximize contact, not full attendance.",
        "SUPPORT: lodging Batesville Fri; lodging Blytheville Sat (mission transition).",
        "SUCCESS: conversations, relationships, signups, social — not speaking time.",
      ].join("\n"),
    ),
  },
  {
    key: "lodging-batesville-2026-07-24",
    calendarSlug: "travel",
    internalTitle: "Overnight Stay – Batesville",
    campaignDisplayTitle: "Overnight – Batesville",
    eventType: "Travel / Lodging",
    status: "HOLD",
    priority: "Medium",
    startsAt: chicagoLocalToDate("2026-07-24T21:30:00"),
    endsAt: chicagoLocalToDate("2026-07-25T08:00:00"),
    city: "Batesville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "lodging-batesville-2026-07-24",
      "SUPPORT child of cave-city-watermelon-festival-2026-07-24. Hotel TBD. Early Sat start for festival. Charge gear; restock literature; confirm parade timing.",
    ),
  },
  {
    key: "lodging-blytheville-2026-07-25",
    calendarSlug: "travel",
    internalTitle: "Overnight Stay – Blytheville",
    campaignDisplayTitle: "Overnight – Blytheville",
    eventType: "Travel / Lodging / Mission Transition",
    status: "HOLD",
    priority: "Medium",
    startsAt: chicagoLocalToDate("2026-07-25T21:00:00"),
    endsAt: chicagoLocalToDate("2026-07-26T08:00:00"),
    city: "Blytheville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "lodging-blytheville-2026-07-25",
      "TRANSITION lodging after Cave City festival → next NE Arkansas day (TBD). Parent swing: Northeast Arkansas. Hotel TBD. Not a destination event.",
    ),
  },

  // ── August 1 SW Arkansas ──────────────────────────────────────────
  {
    key: "slovak-fish-fry-2026-08-01",
    calendarSlug: "public-events",
    internalTitle: "Slovak Fish Fry – Community Event",
    campaignDisplayTitle: "Slovak Fish Fry – Community Event",
    eventType: "Community Festival / Voter Outreach",
    status: "HOLD",
    priority: "Normal",
    startsAt: chicagoLocalToDate("2026-08-01T11:00:00"),
    endsAt: chicagoLocalToDate("2026-08-01T12:59:00"),
    city: "Unknown",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "slovak-fish-fry-2026-08-01",
      "EXTERNAL engagement same day as SW AR leadership gathering.\nCity/time: VERIFY (source said Quendy — confirm Slovak/Quenemo community).\nEnd time placeholder until confirmed.\nLinked: sw-ar-leadership-2026-08-01",
    ),
  },
  {
    key: "sw-ar-leadership-2026-08-01",
    calendarSlug: "county-activity",
    internalTitle: "Southwest Arkansas Regional Leadership Gathering",
    campaignDisplayTitle: "Southwest Arkansas Regional Leadership Gathering",
    eventType: "Regional Strategy Meeting / Coalition Building",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-01T13:00:00"),
    endsAt: chicagoLocalToDate("2026-08-01T15:00:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "sw-ar-leadership-2026-08-01",
      [
        "INTERNAL strategy mission (same day as Slovak Fish Fry).",
        "Counties noted: Pike, Howard, Montgomery (+ TBD).",
        "REQUIRED: structured meeting report (attendees, concerns, actions, volunteers, risks).",
        "Agenda: intros · county updates · campaign overview · priorities · volunteers · events · actions.",
        "Linked external: slovak-fish-fry-2026-08-01",
      ].join("\n"),
    ),
  },

  // ── August 2 fundraiser ───────────────────────────────────────────
  {
    key: "fundraiser-bramlett-2026-08-02",
    calendarSlug: "fundraising",
    internalTitle: "Fundraiser at Jim Bob Bramlett's",
    campaignDisplayTitle: "Fundraiser at Jim Bob Bramlett's",
    eventType: "Campaign Fundraiser / Donor Relations",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-02T16:00:00"),
    endsAt: chicagoLocalToDate("2026-08-02T19:00:00"),
    venueName: "Host residence – Jim Bob Bramlett",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "fundraiser-bramlett-2026-08-02",
      [
        "CATEGORY: Tier 1 Finance & Relationship Mission.",
        "HOST: Jim Bob Bramlett. Address TBD — not stored in git.",
        "Arrive 30–45 min early. Remarks 5–10 min. Meet every attendee.",
        "FOLLOW-UP 24–48h: handwritten thank-you to host; contacts; donor follow-ups.",
        "SUCCESS: conversations, prospects, commitments — funds tracked separately.",
      ].join("\n"),
    ),
  },

  // ── August 3 dental (protected) ───────────────────────────────────
  {
    key: "personal-dental-2026-08-03",
    calendarSlug: "protected-personal",
    internalTitle: "Dental Appointment – Crown Procedure",
    campaignDisplayTitle: "Personal — Private Appointment",
    restrictedDisplayTitle: "Unavailable – Private Appointment",
    eventType: "Personal / Medical Appointment",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-03T10:00:00"),
    endsAt: chicagoLocalToDate("2026-08-03T12:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "personal-dental-2026-08-03",
      "PROTECTED PERSONAL. Provider first name only in operator notes. Recommend travel buffer before; 2–4h soft recovery after (no public events). Staff see Unavailable only. Feeds Availability (Step 12) when authorized.",
    ),
  },
  {
    key: "personal-dental-recovery-buffer-2026-08-03",
    calendarSlug: "protected-personal",
    internalTitle: "Recovery / soft buffer after private appointment",
    campaignDisplayTitle: "Personal — Unavailable (buffer)",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-03T12:00:00"),
    endsAt: chicagoLocalToDate("2026-08-03T16:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "personal-dental-recovery-buffer-2026-08-03",
      "Soft recovery buffer after personal-dental-2026-08-03. Operator may shorten/extend. Do not auto-cancel campaign events.",
    ),
  },

  // ── August 4–5 El Dorado / Russellville ───────────────────────────
  {
    key: "travel-eldorado-position-2026-08-04",
    calendarSlug: "travel",
    internalTitle: "Travel to El Dorado (positioning)",
    campaignDisplayTitle: "Travel to El Dorado",
    eventType: "Travel / Mission Positioning",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-04T17:30:00"),
    endsAt: chicagoLocalToDate("2026-08-04T19:30:00"),
    city: "El Dorado",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-eldorado-position-2026-08-04",
      "SUPPORT for retired-ministers-eldorado-2026-08-05. Lodging TBD. South Arkansas Campaign Swing. Blocks other meetings in window.",
    ),
  },
  {
    key: "retired-ministers-eldorado-2026-08-05",
    calendarSlug: "public-events",
    internalTitle: "Retired Ministers Luncheon – El Dorado",
    campaignDisplayTitle: "Retired Ministers Luncheon – El Dorado",
    eventType: "Community Outreach / Faith Leader Engagement",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-05T10:30:00"),
    endsAt: chicagoLocalToDate("2026-08-05T13:30:00"),
    city: "El Dorado",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "retired-ministers-eldorado-2026-08-05",
      [
        "Tier 1 Strategic Relationship Building – faith leaders.",
        "Venue TBD. Union County / South Arkansas.",
        "AFTER: travel to Russellville (transition) — travel-russellville-2026-08-05.",
        "FOLLOW-UP 48h: thank organizers; contacts; concerns documented.",
      ].join("\n"),
    ),
  },
  {
    key: "travel-russellville-2026-08-05",
    calendarSlug: "travel",
    internalTitle: "Travel to Russellville (after El Dorado luncheon)",
    campaignDisplayTitle: "Travel to Russellville",
    eventType: "Travel / Mission Transition",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-05T14:30:00"),
    endsAt: chicagoLocalToDate("2026-08-05T18:30:00"),
    city: "Russellville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-russellville-2026-08-05",
      "TRANSITION after retired-ministers-eldorado-2026-08-05. Exact depart TBD after luncheon. Lodging Russellville TBD. Record luncheon notes while fresh.",
    ),
  },

  // ── August 6–8 Hope swing (+ Aug 8 Clinton conflict) ──────────────
  {
    key: "travel-rosebud-home-2026-08-06",
    calendarSlug: "travel",
    internalTitle: "Travel Russellville/Pope → Rose Bud (home reset)",
    campaignDisplayTitle: "Travel home – Rose Bud",
    eventType: "Travel / Return Home",
    status: "HOLD",
    priority: "Normal",
    startsAt: chicagoLocalToDate("2026-08-06T18:00:00"),
    endsAt: chicagoLocalToDate("2026-08-06T21:00:00"),
    city: "Rose Bud",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-rosebud-home-2026-08-06",
      "After Pope County HQ opening (enter HQ event separately if confirmed). Restock; laundry; charge gear; review Hope itinerary.",
    ),
  },
  {
    key: "travel-hope-2026-08-07",
    calendarSlug: "travel",
    internalTitle: "Travel to Hope (festival positioning)",
    campaignDisplayTitle: "Travel to Hope",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-07T14:00:00"),
    endsAt: chicagoLocalToDate("2026-08-07T20:00:00"),
    city: "Hope",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-hope-2026-08-07",
      "SUPPORT for hope-watermelon-festival-2026-08-08. Hotel TBD. Parent: Hope Watermelon Festival Campaign Swing.",
    ),
  },
  {
    key: "hope-watermelon-festival-2026-08-08",
    calendarSlug: "field",
    internalTitle: "Hope Watermelon Festival",
    campaignDisplayTitle: "Hope Watermelon Festival",
    eventType: "Community Festival / Regional Outreach",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-08T08:00:00"),
    endsAt: chicagoLocalToDate("2026-08-08T21:00:00"),
    city: "Hope",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "hope-watermelon-festival-2026-08-08",
      [
        "Tier 1 Major Community Outreach. Hempstead County.",
        "DATA QUALITY CONFLICT: Same calendar day as clinton-day-dinner-2026-08-08 (Arkadelphia).",
        "Operator must choose primary or split day — do not auto-resolve.",
        "Optional festival activities; maximize voter contact.",
      ].join("\n"),
    ),
  },
  {
    key: "clinton-day-dinner-2026-08-08",
    calendarSlug: "public-events",
    internalTitle: "30th Annual Clinton Day Dinner – Clark County Democrats",
    campaignDisplayTitle: "Clinton Day Dinner – Clark County Democrats",
    eventType: "Campaign Dinner / Political Networking",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-08T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-08T21:00:00"),
    city: "Arkadelphia",
    venueName: "Martin B. Garrison Student Center – Grand Ballroom, Henderson State University",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "clinton-day-dinner-2026-08-08",
      [
        "STATUS: Invitation received – RSVP PENDING (not Confirmed until accepted).",
        "Tier 1 Political Networking. Keynote: Fred Love (Governor candidate).",
        "Doors/silent auction 5:00 · Dinner 6:00 · Program after.",
        "OPEN: RSVP · tickets vs table · lobby candidate table · merchandise.",
        "CONTACT: Leslie Bohn (Chair, Clark County Democrats) — contact in operator CRM only.",
        "Guest names for tables due Mon Aug 3 if reserving table.",
        "DATA QUALITY CONFLICT: Same day as hope-watermelon-festival-2026-08-08.",
      ].join("\n"),
    ),
  },

  // ── August 9–10 Saline / White ────────────────────────────────────
  {
    key: "canvass-benton-josh-irby-2026-08-09",
    calendarSlug: "field",
    internalTitle: "Canvass Benton with Josh Irby",
    campaignDisplayTitle: "Canvass Benton with Josh Irby",
    eventType: "Field Operations / Door-to-Door Canvassing",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-09T13:00:00"),
    endsAt: chicagoLocalToDate("2026-08-09T17:00:00"),
    city: "Benton",
    locationDisclosure: "CITY",
    defaultVisibility: "BUSY_ONLY",
    candidateAttendance: true,
    privateNotes: notes(
      "canvass-benton-josh-irby-2026-08-09",
      [
        "FIELD OPS. Start: after church (exact TBD) — 1:00 PM placeholder.",
        "FIELD LEAD: Josh Irby (Saline County).",
        "Staging location TBD. Walk packets / turf required.",
        "SUCCESS: doors, conversations, supporters, undecided, volunteers, yard signs, follow-ups.",
        "FOLLOW-UP 24h: upload results; thank Josh/volunteers; yard sign delivery.",
      ].join("\n"),
    ),
  },
  {
    key: "rowdy-women-lunch-searcy-2026-08-10",
    calendarSlug: "public-events",
    internalTitle: "Rowdy Women Lunch – Searcy",
    campaignDisplayTitle: "Rowdy Women Lunch – Searcy",
    eventType: "Community Outreach / Women's Leadership Engagement",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-10T12:00:00"),
    endsAt: chicagoLocalToDate("2026-08-10T13:00:00"),
    city: "Searcy",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "rowdy-women-lunch-searcy-2026-08-10",
      "Tier 1 Community Leadership & Women's Engagement. White County. Venue TBD. Established civic network. FOLLOW-UP 48h thank organizer + contacts.",
    ),
  },

  // ── August 11–13 Jefferson immersion ──────────────────────────────
  {
    key: "travel-pine-bluff-2026-08-11",
    calendarSlug: "travel",
    internalTitle: "Travel to Pine Bluff (Jefferson immersion)",
    campaignDisplayTitle: "Travel to Pine Bluff",
    eventType: "Travel / Mission Positioning",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-11T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-11T20:00:00"),
    city: "Pine Bluff",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-pine-bluff-2026-08-11",
      "After work departure. Parent: jefferson-immersion-2026-08-12. Lodging Pine Bluff TBD.",
    ),
  },
  {
    key: "jefferson-immersion-2026-08-12",
    calendarSlug: "county-activity",
    internalTitle: "Jefferson County Immersion",
    campaignDisplayTitle: "Jefferson County Immersion",
    eventType: "Community Immersion / Listening Tour",
    status: "CONFIRMED",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-08-12T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-13T17:00:00"),
    city: "Pine Bluff",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "jefferson-immersion-2026-08-12",
      [
        "Tier 1 County Immersion — multi-day listening (not a single public headline event).",
        "Wed–Thu: leaders, businesses, faith, residents; document issues.",
        "Thu evening: travel home Rose Bud — travel-rosebud-2026-08-13.",
        "SUCCESS: relationship density + intelligence, not festival metrics.",
      ].join("\n"),
    ),
  },
  {
    key: "travel-rosebud-2026-08-13",
    calendarSlug: "travel",
    internalTitle: "Travel home – Rose Bud (after Jefferson)",
    campaignDisplayTitle: "Travel home – Rose Bud",
    eventType: "Travel / Return Home",
    status: "HOLD",
    priority: "Normal",
    startsAt: chicagoLocalToDate("2026-08-13T17:30:00"),
    endsAt: chicagoLocalToDate("2026-08-13T21:00:00"),
    city: "Rose Bud",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-rosebud-2026-08-13",
      "Home reset after jefferson-immersion-2026-08-12 before North Central swing.",
    ),
  },

  // ── August 14–15 North Central ────────────────────────────────────
  {
    key: "travel-horseshoe-bend-2026-08-14",
    calendarSlug: "travel",
    internalTitle: "Travel to Horseshoe Bend",
    campaignDisplayTitle: "Travel to Horseshoe Bend",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-14T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-14T21:00:00"),
    city: "Horseshoe Bend",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-horseshoe-bend-2026-08-14",
      "Meet Sandy Meier (local point person). Review Sat schedule. Parent: pioneer-days-horseshoe-bend-2026-08-15.",
    ),
  },
  {
    key: "pioneer-days-horseshoe-bend-2026-08-15",
    calendarSlug: "field",
    internalTitle: "Horseshoe Bend Pioneer Days Festival",
    campaignDisplayTitle: "Horseshoe Bend Pioneer Days Festival",
    eventType: "Community Festival / Voter Outreach",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-15T08:00:00"),
    endsAt: chicagoLocalToDate("2026-08-15T14:00:00"),
    city: "Horseshoe Bend",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "pioneer-days-horseshoe-bend-2026-08-15",
      "LOCAL COORDINATOR: Sandy Meier. Morning festival then travel to Jonesboro for 4pm back-to-school — verify drive time.",
    ),
  },
  {
    key: "back-to-school-shemal-carter-2026-08-15",
    calendarSlug: "public-events",
    internalTitle: "Back-to-School Event with Shemal Carter",
    campaignDisplayTitle: "Back-to-School Event with Shemal Carter",
    eventType: "Community Outreach / Education",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-15T16:00:00"),
    endsAt: chicagoLocalToDate("2026-08-15T17:30:00"),
    city: "Jonesboro",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "back-to-school-shemal-carter-2026-08-15",
      "HOST: Shemal Carter. Craighead County. Rally immediately following — jonesboro-rally-after-bts-2026-08-15. Same day as Pioneer Days AM — travel between.",
    ),
  },
  {
    key: "jonesboro-rally-after-bts-2026-08-15",
    calendarSlug: "public-events",
    internalTitle: "Rally following Back-to-School (Jonesboro)",
    campaignDisplayTitle: "Rally – Jonesboro (after Back-to-School)",
    eventType: "Campaign Rally / Community Outreach",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-15T17:30:00"),
    endsAt: chicagoLocalToDate("2026-08-15T19:30:00"),
    city: "Jonesboro",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "jonesboro-rally-after-bts-2026-08-15",
      "Immediately after back-to-school-shemal-carter-2026-08-15. Exact end TBD.",
    ),
  },

  // ── August 16 Bryant rally ────────────────────────────────────────
  {
    key: "bryant-rally-josh-irby-2026-08-16",
    calendarSlug: "field",
    internalTitle: "Bryant Community Rally with Josh Irby",
    campaignDisplayTitle: "Bryant Community Rally with Josh Irby",
    eventType: "Campaign Rally / Volunteer Mobilization",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-16T16:00:00"),
    endsAt: chicagoLocalToDate("2026-08-16T18:00:00"),
    city: "Bryant",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "bryant-rally-josh-irby-2026-08-16",
      "LOCAL COORDINATOR: Josh Irby (Saline Field Lead). Arrive 3:30 setup. Remarks ~4:15. Recruit after. Links to canvass-benton-josh-irby-2026-08-09 county continuity.",
    ),
  },

  // ── August 17–20 NWA Immersion ────────────────────────────────────
  {
    key: "nwa-immersion-tour-2026-08-17",
    calendarSlug: "county-activity",
    internalTitle: "Northwest Arkansas Immersion Tour – Benton County",
    campaignDisplayTitle: "Northwest Arkansas Immersion Tour",
    eventType: "Regional Community Immersion / Relationship Building",
    status: "HOLD",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-08-17T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-20T20:00:00"),
    city: "Bentonville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "nwa-immersion-tour-2026-08-17",
      [
        "MISSION ID: NWA-IMMERSION-2026-01. Tier 1 Highest Priority. Status: Planning.",
        "Build Benton County via daytime immersion + nightly JP-hosted community rallies (hosts TBD).",
        "Mon travel in · Thu evening return Rose Bud.",
        "REQUIRED nightly intelligence report; end: Benton County Summary + 90-day plan.",
        "Do not invent four Confirmed rallies until JP hosts/venues lock — evening slots TBD inside this umbrella.",
        "LODGING: Shela Norman (Bella Vista) offered Airbnb for this return window (email Jul 12, 2026). Status: OFFERED — accept/decline pending. See draft_obs_benton_aug_trip_2026.",
        "FOIA tax-rolls ask from same email is Scott-owned — not a mission day block.",
      ].join("\n"),
    ),
  },

  // ── August 21–22 Mountain View + virtual ──────────────────────────
  {
    key: "travel-mountain-view-2026-08-21",
    calendarSlug: "travel",
    internalTitle: "Travel to Mountain View",
    campaignDisplayTitle: "Travel to Mountain View",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-21T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-21T21:00:00"),
    city: "Mountain View",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-mountain-view-2026-08-21",
      "After work. Parent: bluegrass-fried-chicken-2026-08-21. Lodging Mountain View TBD.",
    ),
  },
  {
    key: "bluegrass-fried-chicken-2026-08-21",
    calendarSlug: "field",
    internalTitle: "Bluegrass & Fried Chicken Festival – Mountain View",
    campaignDisplayTitle: "Bluegrass & Fried Chicken Festival",
    eventType: "Community Festival / Voter Outreach",
    status: "HOLD",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-08-21T18:00:00"),
    endsAt: chicagoLocalToDate("2026-08-22T13:00:00"),
    city: "Mountain View",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "bluegrass-fried-chicken-2026-08-21",
      "Ozarks & River Valley Tour. Sat morning festival then ALREAD Meet 2pm. Evening: travel Fouke for Miller immersion (not Rose Bud) — operator reconcile.",
    ),
  },
  {
    key: "alread-eh-club-meet-2026-08-22",
    calendarSlug: "internal-meetings",
    internalTitle: "ALREAD EH Club Meeting (Google Meet)",
    campaignDisplayTitle: "ALREAD EH Club Meeting (Virtual)",
    eventType: "Community Organization / Virtual Engagement",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-22T14:00:00"),
    endsAt: chicagoLocalToDate("2026-08-22T15:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "alread-eh-club-meet-2026-08-22",
      "VIRTUAL while Mountain View festival weekend. Meeting link in operator calendar/CRM only — not committed to git. Same-day hybrid: field location ≠ meeting location.",
    ),
  },
  {
    key: "travel-fouke-miller-2026-08-22",
    calendarSlug: "travel",
    internalTitle: "Travel to Fouke (Miller County immersion)",
    campaignDisplayTitle: "Travel to Fouke",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-22T16:00:00"),
    endsAt: chicagoLocalToDate("2026-08-22T22:00:00"),
    city: "Fouke",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-fouke-miller-2026-08-22",
      "After Mountain View / Meet. Stay with Becky (host lodging). Parent: miller-immersion-2026-08-23. Reconcile vs earlier Rose Bud return plan.",
    ),
  },

  // ── August 23–24 Miller ───────────────────────────────────────────
  {
    key: "miller-immersion-2026-08-23",
    calendarSlug: "county-activity",
    internalTitle: "Miller County Immersion Tour",
    campaignDisplayTitle: "Miller County Immersion Tour",
    eventType: "County Immersion / Relationship Building",
    status: "HOLD",
    priority: "High",
    isMultiDay: true,
    startsAt: chicagoLocalToDate("2026-08-23T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-24T17:00:00"),
    city: "Fouke",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "miller-immersion-2026-08-23",
      [
        "MISSION ID: MC-IMMERSION-2026-01. Sun: church with Becky (host) then immersion. Mon: day 2 immersion.",
        "Mon evening travel to Little Rock overnight — lodging-littlerock-2026-08-24.",
        "DELIVERABLES: Miller County intelligence report; contacts; volunteer summary; follow-ups.",
        "Host contact details in operator CRM only.",
      ].join("\n"),
    ),
  },
  {
    key: "lodging-littlerock-2026-08-24",
    calendarSlug: "travel",
    internalTitle: "Overnight Stay – Little Rock (after Miller)",
    campaignDisplayTitle: "Overnight – Little Rock",
    eventType: "Travel / Lodging",
    status: "HOLD",
    priority: "Medium",
    startsAt: chicagoLocalToDate("2026-08-24T19:00:00"),
    endsAt: chicagoLocalToDate("2026-08-25T08:00:00"),
    city: "Little Rock",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "lodging-littlerock-2026-08-24",
      "Staging after miller-immersion-2026-08-23 for Central Arkansas flexibility. Hotel TBD.",
    ),
  },

  // ── August 27 Clark ───────────────────────────────────────────────
  {
    key: "clark-county-meeting-arkadelphia-2026-08-27",
    calendarSlug: "county-activity",
    internalTitle: "Clark County Community Meeting – Arkadelphia",
    campaignDisplayTitle: "Clark County Community Meeting – Arkadelphia",
    eventType: "County Immersion / Community Leadership Meeting",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-27T10:00:00"),
    endsAt: chicagoLocalToDate("2026-08-27T12:00:00"),
    city: "Arkadelphia",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "clark-county-meeting-arkadelphia-2026-08-27",
      "Kelly organizing. Guests: one confirmed, one awaiting. Venue/time window placeholder 10–12 until exact set. Continuity with clinton-day-dinner-2026-08-08 (same county). REQUIRED meeting notes. FOLLOW-UP 48h.",
    ),
  },

  // ── August 29–30 Mt Nebo / Marion ─────────────────────────────────
  {
    key: "mt-nebo-chicken-fry-2026-08-29",
    calendarSlug: "field",
    internalTitle: "Mt. Nebo Chicken Fry – Dardanelle",
    campaignDisplayTitle: "Mt. Nebo Chicken Fry",
    eventType: "Community Festival / Voter Outreach",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-29T10:00:00"),
    endsAt: chicagoLocalToDate("2026-08-29T16:00:00"),
    city: "Dardanelle",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "mt-nebo-chicken-fry-2026-08-29",
      "Early travel from home. Evening travel to Marion County lodging — travel-marion-2026-08-29.",
    ),
  },
  {
    key: "travel-marion-2026-08-29",
    calendarSlug: "travel",
    internalTitle: "Travel to Marion County (after Mt. Nebo)",
    campaignDisplayTitle: "Travel to Marion County",
    eventType: "Travel / Mission Positioning",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-29T17:00:00"),
    endsAt: chicagoLocalToDate("2026-08-29T21:00:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-marion-2026-08-29",
      "SUPPORT for marion-immersion-2026-08-30. Lodging TBD.",
    ),
  },
  {
    key: "marion-immersion-2026-08-30",
    calendarSlug: "county-activity",
    internalTitle: "Marion County Immersion",
    campaignDisplayTitle: "Marion County Immersion",
    eventType: "County Listening Tour / Relationship Building",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-30T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-30T17:00:00"),
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "marion-immersion-2026-08-30",
      "Sunday immersion after Mt. Nebo. Church/community as appropriate. Evening return Rose Bud. Structure itinerary for true immersion.",
    ),
  },

  // ── October Baxter Farm Bureau ────────────────────────────────────
  {
    key: "baxter-farm-bureau-2026-10-06",
    calendarSlug: "public-events",
    internalTitle: "Baxter County Farm Bureau Annual Convention & Candidate Forum",
    campaignDisplayTitle: "Baxter County Farm Bureau Candidate Forum",
    eventType: "Campaign Candidate Forum / Speaking Engagement",
    status: "CONFIRMED",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-10-06T17:00:00"),
    endsAt: chicagoLocalToDate("2026-10-06T21:00:00"),
    city: "Mountain Home",
    venueName: "Baxter County Fairgrounds",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes: notes(
      "baxter-farm-bureau-2026-10-06",
      [
        "RSVP accepted. Lower prep intensity (months out). Arrive ~5:00 for 6:00 forum.",
        "Speaking length TBD by candidate count. Merch/AV policies unknown.",
        "CONTACT: Elliott Golmon (Legislative Chair) — CRM only.",
        "Kelly is Farm Bureau member — use in intro if appropriate.",
        "PRE: confirm agenda, table, AV. POST: thank leadership; contacts; photos.",
      ].join("\n"),
    ),
  },
];

/** Undated / infrastructure work — EventPlanningDraft only */
const PLANNING_DRAFTS = [
  {
    id: "draft_obs_benton_aug_trip_2026",
    status: "PLANNING",
    title: "August Benton County Campaign Trip",
    primaryCalendar: "Travel",
    payload: {
      draftId: "draft_obs_benton_aug_trip_2026",
      status: "PLANNING",
      basic: {
        primaryCalendar: "Travel",
        additionalCalendars: [],
        eventType: "Campaign Travel / Regional Organizing",
        internalTitle: "August Benton County Campaign Trip",
        campaignDisplayTitle: "August Benton County Campaign Trip",
        priority: "High",
        confirmationStatus: "Hold",
      },
      timing: {
        timezone: "America/Chicago",
        allDay: false,
        note: "Primary stay window: NWA Immersion Tour Aug 17–20 (HOLD). Lodging decision pending.",
      },
      location: {
        state: "Arkansas",
        county: "Benton",
        cities: ["Bentonville", "Rogers", "Bella Vista"],
        locationDisclosure: "CITY",
      },
      privateMissionNotes: [
        "SOURCE: Shela L. Norman email Sun Jul 12, 2026 (after Bella Vista meet with Kelly + Scott).",
        "NOT a dated calendar Event until lodging accepted and itinerary locks.",
        "LODGING OFFER: Shela Norman Bella Vista Airbnb — available for the Benton return window. Status: OFFERED (not yet accepted). Respond yes/no.",
        "Links to live HOLD: nwa-immersion-tour-2026-08-17 (Aug 17–20 Benton County immersion).",
        "FOIA tax-rolls request: Shela asked Scott for helpful info to submit. Campaign calendar does not own this — Scott follow-up / CRM only.",
        "Contact phone/email in operator CRM only — never commit.",
      ].join("\n"),
      openDecisions: [
        "Accept Shela Norman Bella Vista Airbnb for Aug 17–20 Benton immersion?",
        "Confirm FOIA tax-rolls path stays with Scott (no Kelly calendar block).",
      ],
    },
  },
  {
    id: "draft_obs_pope_venue_planning_2026",
    status: "PLANNING",
    title: "Pope County Venue Planning & Site Research",
    primaryCalendar: "Staff Work Schedules",
    payload: {
      draftId: "draft_obs_pope_venue_planning_2026",
      status: "PLANNING",
      basic: {
        primaryCalendar: "Staff Work Schedules",
        additionalCalendars: [],
        eventType: "Campaign Planning / Logistics",
        internalTitle: "Pope County Venue Planning & Site Research",
        campaignDisplayTitle: "Pope County Venue Planning & Site Research",
        priority: "Normal",
        confirmationStatus: "Hold",
      },
      timing: { timezone: "America/Chicago", note: "No fixed date — infrastructure work" },
      location: {
        state: "Arkansas",
        county: "Pope",
        city: "Russellville",
        locationDisclosure: "CITY",
      },
      privateMissionNotes: [
        "NOT a public calendar Event — Venue Directory work.",
        "Leads: ATU (rental guide) · Dog Ear Books · Dreami Tea · Pope County Dem HQ 409 E 4th (AV issues, portable AC).",
        "Contact: Mary Ella — link from CRM when available.",
        "Tasks: capacity/cost/accessibility/parking/Wi-Fi/AV/signage policies.",
      ].join("\n"),
    },
  },
];

const proof = {
  pass: PASS,
  createdAt: new Date().toISOString(),
  eventsCreated: [],
  eventsUpdated: [],
  draftsUpserted: [],
  conflictsSurfaced: [
    "hope-watermelon-festival-2026-08-08 ∩ clinton-day-dinner-2026-08-08",
    "Aug 22 Rose Bud return vs Fouke/Miller travel — Fouke path ingested",
  ],
  omittedFromGit: [
    "Phone numbers",
    "Email addresses",
    "Street addresses",
    "Google Meet join URLs",
  ],
};

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { archivedAt: null, privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
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

  if (existing && existing.status !== "CANCELLED") {
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    proof.eventsUpdated.push({
      key: spec.key,
      eventNumber: updated.eventNumber,
      status: updated.status,
    });
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
        reason: `Observation ingest ${PASS}`,
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
        reason: `Live ingest ${PASS}`,
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

  proof.eventsCreated.push({
    key: spec.key,
    eventNumber: created.eventNumber,
    status: created.status,
  });
  console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
}

async function upsertPlanningDraft(draft) {
  await prisma.eventPlanningDraft.upsert({
    where: { id: draft.id },
    create: {
      id: draft.id,
      status: draft.status,
      title: draft.title,
      primaryCalendar: draft.primaryCalendar,
      payload: draft.payload,
      draftVersion: 1,
    },
    update: {
      status: draft.status,
      title: draft.title,
      primaryCalendar: draft.primaryCalendar,
      payload: draft.payload,
      draftVersion: { increment: 1 },
    },
  });
  proof.draftsUpserted.push(draft.id);
  console.log(`DRAFT: ${draft.id}`);
}

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const slugs = [...new Set(LIVE_EVENTS.map((e) => e.calendarSlug))];
  const calendars = await prisma.calendar.findMany({
    where: { slug: { in: slugs }, archivedAt: null },
  });
  const bySlug = Object.fromEntries(calendars.map((c) => [c.slug, c]));
  for (const slug of slugs) {
    if (!bySlug[slug]) throw new Error(`Calendar missing: ${slug}`);
  }

  console.log(`--- ${PASS} live upserts (${LIVE_EVENTS.length}) ---`);
  for (const spec of LIVE_EVENTS) {
    await upsertLive(actorUser, bySlug, spec);
  }

  console.log(`--- ${PASS} planning drafts (${PLANNING_DRAFTS.length}) ---`);
  for (const draft of PLANNING_DRAFTS) {
    await upsertPlanningDraft(draft);
  }

  const active = await prisma.event.findMany({
    where: {
      archivedAt: null,
      status: { not: "CANCELLED" },
      privateNotes: { contains: `[pass:${PASS}]` },
    },
    select: { eventNumber: true, internalTitle: true, status: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  });
  proof.activeCount = active.length;
  proof.active = active.map((e) => ({
    eventNumber: e.eventNumber,
    title: e.internalTitle,
    status: e.status,
    startsAt: e.startsAt.toISOString(),
  }));

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "observation-pass-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(
    `PASS: created=${proof.eventsCreated.length} updated=${proof.eventsUpdated.length} drafts=${proof.draftsUpserted.length} active=${active.length}`,
  );
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
