/**
 * KCCC LIVE INGEST PASS 3 — Jul 22–Sep 13, 2026
 * Feature Freeze honored · no AI · no new routes/schema
 *
 * Status mapping (no new enums):
 *   CONFIRMED → CONFIRMED
 *   TENTATIVE → TENTATIVE
 *   INFORMATIONAL / PENDING_APPROVAL → HOLD (+ notes)
 *   STAGED_UNKNOWN → draft JSON only
 *   SUPERSEDED → CANCELLED
 *
 * Meet dial-in/PIN → privateNotes only (never campaignDisplayTitle / virtualMeetingUrl)
 * Opaque Google Calendar template URLs → staged source metadata only (no invented fields)
 *
 * Usage: npm run events:ingest:operator-pass3
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "PASS3-2026-07-19";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error("REFUSED: Pass 3 blocked on deploy without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true");
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
if (!process.env.APP_SESSION_SECRET || process.env.APP_SESSION_SECRET.trim().length < 32) {
  console.error("FAIL: APP_SESSION_SECRET missing or too short");
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

function ct(localIso) {
  return new Date(`${localIso}-05:00`);
}

function notes(key, text) {
  return `[ingestKey:${key}]\n[pass:${PASS}]\n${text}`;
}

function meetBlock(label, meet, dial, pin) {
  return [
    `[RESTRICTED_MEET:${label}]`,
    `Meet: ${meet}`,
    `Dial-in: ${dial}`,
    `PIN: ${pin}`,
    "Do not expose dial-in/PIN in public or limited projections.",
  ].join("\n");
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

async function findByKey(key) {
  return prisma.event.findFirst({
    where: { privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
}

/**
 * Opaque Google Calendar template URLs were referenced by the operator but not
 * pasted as resolvable event payloads in the Pass 3 instruction text.
 * Preserve placeholders — do not invent event fields from opaque IDs.
 */
const OPAQUE_GCAL_1 =
  process.env.KCCC_PASS3_GCAL_URL_1?.trim() ||
  "OPAQUE_GOOGLE_CALENDAR_TEMPLATE_URL_1_PENDING_OPERATOR_PASTE";
const OPAQUE_GCAL_2 =
  process.env.KCCC_PASS3_GCAL_URL_2?.trim() ||
  "OPAQUE_GOOGLE_CALENDAR_TEMPLATE_URL_2_PENDING_OPERATOR_PASTE";

const LIVE_EVENTS = [
  // ── HSV restore (newer evidence) ───────────────────────────────────
  {
    key: "travel-hsv-2026-07-22",
    calendarSlug: "travel",
    internalTitle: "Travel to Hot Springs Village",
    campaignDisplayTitle: "Travel to Hot Springs Village",
    eventType: "Travel block",
    status: "TENTATIVE",
    isAllDay: true,
    startsAt: ct("2026-07-22T00:00:00"),
    endsAt: ct("2026-07-22T23:59:59"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    privateNotes: notes(
      "travel-hsv-2026-07-22",
      [
        "CONFIRMED commitment; departure time TENTATIVE.",
        "Travelers: Kelly Grappe, Steve Grappe",
        "Origin: Farm / after work",
        "Destination: Hot Springs Village, Arkansas (host lodging — Deb Bryan / Deborah Bryan)",
        "Start: After Kelly finishes work",
        "Departure time: UNKNOWN · Arrival time: UNKNOWN · Exact route: UNKNOWN",
        "Kelly and Steve travel Wednesday evening so Kelly can work remotely Thursday before the Democratic meeting.",
        "GATE: Have Hot Springs Village gate-access email available for Gate Security (sponsor DEBORAH BRYAN). Full gate text on lodging Event lodging-hsv-host-2026-07-22 (KCCC-2026-0040).",
        "Do not duplicate lodging-gate or Road to Blue host-ops text on this travel Event.",
      ].join("\n"),
    ),
  },
  {
    key: "lodging-hsv-deb-bryan-2026-07-22",
    calendarSlug: "travel",
    internalTitle: "Overnight in Hot Springs Village",
    campaignDisplayTitle: "Overnight in Hot Springs Village",
    eventType: "Travel block",
    status: "CONFIRMED",
    startsAt: ct("2026-07-22T20:00:00"),
    endsAt: ct("2026-07-23T08:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    sensitivityLevel: "RESTRICTED",
    privateNotes: notes(
      "lodging-hsv-deb-bryan-2026-07-22",
      "Host: Deb Bryan (confirmed).\nResidential street address: NOT stored in public/broad fields.\nPhone/email: NOT stored in public fields.\nPrivate workspace available for Kelly remote work Thursday.\nVisibility: restricted campaign-team appropriate.\nRestore from newer evidence after Pass-2 supersession.",
    ),
  },
  {
    key: "kelly-work-hsv-remote-2026-07-23",
    calendarSlug: "protected-personal",
    internalTitle: "Kelly Working Remotely — Hot Springs Village",
    campaignDisplayTitle: "Personal — working Hot Springs Village",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    isAllDay: true,
    startsAt: ct("2026-07-23T00:00:00"),
    endsAt: ct("2026-07-23T23:59:59"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "kelly-work-hsv-remote-2026-07-23",
      "Kelly working remotely in Hot Springs Village Thursday.\nExact work hours: UNKNOWN (do not assume 8–5).\nRestore from newer evidence (distinct from cancelled Pass-1 HSV work key).",
    ),
  },
  {
    key: "hsv-democrats-kelly-2026-07-23",
    calendarSlug: "public-events",
    internalTitle: "Kelly Speaks — Hot Springs Village Democrats",
    campaignDisplayTitle: "Kelly Speaks — Hot Springs Village Democrats",
    eventType: "Speaking Engagement",
    status: "CONFIRMED",
    startsAt: ct("2026-07-23T15:00:00"),
    endsAt: ct("2026-07-23T19:00:00"),
    city: "Hot Springs Village",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    candidateAttendance: true,
    campaignDescription:
      "Kelly is a confirmed speaker. Steve is attending with her. They will bring campaign merchandise and signs. Reserved seating will be available near the stage. Kelly’s speech is expected to be approximately seven minutes, followed by constituent mingling.",
    privateNotes: notes(
      "hsv-democrats-kelly-2026-07-23",
      "Speaker: Kelly Grappe · Guest/campaign support: Steve Grappe (confirmed attending)\nSchedule: Social hour 3:00–4:00 · Dinner 4:00–5:00 · Speech period ~4:15–5:15 · Silent auction/mingling through ~6:30–7:00\nPrimary block 3:00–7:00 PM; 7:00 PM end APPROXIMATE (tentative).\nExact speech slot: UNKNOWN\nMerchandise: confirmed · Attendance: confirmed\nRestore from newer email evidence.",
    ),
  },

  // ── August 2 ───────────────────────────────────────────────────────
  {
    key: "fundraiser-bramlett-2026-08-02",
    calendarSlug: "fundraising",
    internalTitle: "Fundraiser at Jim Bob Bramlett’s",
    campaignDisplayTitle: "Fundraiser at Jim Bob Bramlett’s",
    eventType: "Fundraiser",
    status: "CONFIRMED",
    startsAt: ct("2026-08-02T16:00:00"),
    endsAt: ct("2026-08-02T19:00:00"),
    city: null,
    venueName: "Jim Bob Bramlett’s",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "ATTENDING",
    privateNotes: notes(
      "fundraiser-bramlett-2026-08-02",
      "Location: Jim Bob Bramlett’s — precise residential address NOT supplied; do not invent.\nCONFLICT: Overlaps tentative Faulkner County fundraiser 5:00–7:00 PM (do not auto-resolve).\n" +
        meetBlock(
          "bramlett",
          "https://meet.google.com/uds-ivay-kyq",
          "+1 240-560-3726",
          "582 156 212",
        ),
    ),
  },
  {
    key: "faulkner-dem-fundraiser-2026-08-02",
    calendarSlug: "public-events",
    internalTitle: "The Revolution Continues — Faulkner County Democratic Fundraiser",
    campaignDisplayTitle: "Faulkner County Democratic Fundraiser (tentative)",
    eventType: "Fundraiser",
    status: "HOLD",
    startsAt: ct("2026-08-02T17:00:00"),
    endsAt: ct("2026-08-02T19:30:00"),
    city: "Conway",
    venueName: "Willow Event Center",
    streetAddress: "1040 Holiday Drive",
    locationDisclosure: "EXACT",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: false,
    campaignDescription:
      "Faulkner County Democratic Party fundraiser with a 1776 Philadelphia City Tavern theme. Candidates are offered a few minutes to speak and may distribute push cards, signs, and shirts. Organizers ask candidates to bring a dessert for auction. Attendance has not been confirmed.",
    privateNotes: notes(
      "faulkner-dem-fundraiser-2026-08-02",
      "Status mapping: TENTATIVE / PENDING_APPROVAL → HOLD\nOrganizer: Faulkner County Democratic Party\nVenue: Willow Event Center, 1040 Holiday Drive, Conway, AR\nCONFLICT with confirmed Bramlett fundraiser 4:00–7:00 PM (overlap 5:00–7:00).\nDecision required: Will Kelly attend? Will Steve attend? Bring dessert? Merchandise? Sponsor/tickets?\nDo NOT mark attendance confirmed.",
    ),
  },

  // ── August 4 ───────────────────────────────────────────────────────
  {
    key: "kelly-erin-2026-08-04",
    calendarSlug: "internal-meetings",
    internalTitle: "Kelly / Erin",
    campaignDisplayTitle: "Kelly / Erin",
    eventType: "Meeting",
    status: "CONFIRMED",
    startsAt: ct("2026-08-04T07:30:00"),
    endsAt: ct("2026-08-04T08:00:00"),
    locationDisclosure: "HIDDEN",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "kelly-erin-2026-08-04",
      "Participants: Kelly Grappe, Erin (last name/role UNKNOWN — do not invent).\n" +
        meetBlock(
          "kelly-erin",
          "https://meet.google.com/cam-fitz-vwp",
          "+1 302-316-4293",
          "467 663 480",
        ),
    ),
  },
  {
    key: "travel-eldorado-2026-08-04",
    calendarSlug: "travel",
    internalTitle: "Travel to El Dorado",
    campaignDisplayTitle: "Travel to El Dorado",
    eventType: "Travel block",
    status: "CONFIRMED",
    startsAt: ct("2026-08-04T17:30:00"),
    endsAt: ct("2026-08-04T19:30:00"),
    city: "El Dorado",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-eldorado-2026-08-04",
      "Destination: El Dorado, Arkansas. Physical travel block.\nSource Meet metadata may be residue — do NOT present travel as virtual-only.\n" +
        meetBlock(
          "travel-eldorado-source",
          "https://meet.google.com/mre-kksw-xqv",
          "+1 978-434-0952",
          "992 606 741",
        ),
    ),
  },

  // ── August 5 ───────────────────────────────────────────────────────
  {
    key: "wf-eldorado-immersion-2026-08-05",
    calendarSlug: "public-events",
    internalTitle: "WF El Dorado — Immersion Day",
    campaignDisplayTitle: "WF El Dorado — Immersion Day",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: ct("2026-08-05T07:00:00"),
    endsAt: ct("2026-08-05T08:00:00"),
    city: "El Dorado",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "wf-eldorado-immersion-2026-08-05",
      "Preserve source title — do not expand “WF”. One-hour block only (not all-day).\n" +
        meetBlock(
          "wf-immersion",
          "https://meet.google.com/ipg-xizd-evz",
          "+1 414-909-5480",
          "426 224 243",
        ),
    ),
  },
  {
    key: "retired-ministers-eldorado-2026-08-05",
    calendarSlug: "public-events",
    internalTitle: "Retired Ministers Luncheon — El Dorado",
    campaignDisplayTitle: "Retired Ministers Luncheon — El Dorado",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: ct("2026-08-05T10:30:00"),
    endsAt: ct("2026-08-05T13:30:00"),
    city: "El Dorado",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "retired-ministers-eldorado-2026-08-05",
      meetBlock(
        "retired-ministers",
        "https://meet.google.com/jcc-iuwu-jnj",
        "+1 574-404-7808",
        "843 609 927",
      ),
    ),
  },
  {
    key: "travel-russellville-2026-08-05",
    calendarSlug: "travel",
    internalTitle: "Travel to Russellville",
    campaignDisplayTitle: "Travel to Russellville",
    eventType: "Travel block",
    status: "TENTATIVE",
    isAllDay: true,
    startsAt: ct("2026-08-05T00:00:00"),
    endsAt: ct("2026-08-05T23:59:59"),
    city: "Russellville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-russellville-2026-08-05",
      "CONFIRMED travel requirement; time TENTATIVE.\nOrigin: El Dorado, Arkansas\nDestination: Russellville, Arkansas\nStart: Wednesday night — exact time UNKNOWN\nEnd: UNKNOWN\nLodging: UNKNOWN\nSource: opaque Google Calendar template URL preserved without inventing fields:\n" +
        `googleCalendarTemplateUrl: ${OPAQUE_GCAL_1}\nsourceOwnerHint: kelly@kellygrappe.com (unverified from opaque id alone)`,
    ),
  },

  // ── August 7–8 ─────────────────────────────────────────────────────
  {
    key: "travel-hope-2026-08-07",
    calendarSlug: "travel",
    internalTitle: "Travel to Hope",
    campaignDisplayTitle: "Travel to Hope",
    eventType: "Travel block",
    status: "TENTATIVE",
    isAllDay: true,
    startsAt: ct("2026-08-07T00:00:00"),
    endsAt: ct("2026-08-07T23:59:59"),
    city: "Hope",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "travel-hope-2026-08-07",
      "CONFIRMED travel requirement; time TENTATIVE.\nDestination: Hope, Arkansas\nOrigin: UNKNOWN (do not assume Russellville/El Dorado/LR/farm)\nDeparture time: UNKNOWN\nArrival time: UNKNOWN\nLodging: UNKNOWN\nFriday night — exact clock UNKNOWN.",
    ),
  },
  {
    key: "black-caucus-gbm-2026-08-08",
    calendarSlug: "public-events",
    internalTitle: "Arkansas Democratic Black Caucus General Body Meeting",
    campaignDisplayTitle: "AR Democratic Black Caucus GBM (informational)",
    eventType: "Community meeting",
    status: "HOLD",
    startsAt: ct("2026-08-08T13:00:00"),
    endsAt: ct("2026-08-08T15:00:00"),
    city: "North Little Rock",
    venueName: "Shorter College",
    streetAddress: "604 N. Locust Street",
    postalCode: "72114",
    locationDisclosure: "EXACT",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: false,
    campaignDescription:
      "Quarterly general body meeting of the Arkansas Democratic Black Caucus. The meeting plans to include candidates and discussion of the organization’s role in the upcoming election season. Attendance by Kelly or campaign staff has not been decided.",
    privateNotes: notes(
      "black-caucus-gbm-2026-08-08",
      "Status mapping: INFORMATIONAL / PENDING_APPROVAL → HOLD\nOrganizer: Democratic Party of Arkansas\nVenue: Shorter College, 604 N. Locust Street, North Little Rock, AR 72114\nDo NOT represent Kelly as attendee until approved.\nApproval: Kelly attend? Steve? Other rep? Materials? Speaking time?",
    ),
  },

  // ── September 13 ───────────────────────────────────────────────────
  {
    key: "river-valley-choice-rally-2026-09-13",
    calendarSlug: "public-events",
    internalTitle: "The River Valley Has a Choice Campaign Rally",
    campaignDisplayTitle: "The River Valley Has a Choice Campaign Rally",
    eventType: "Community meeting",
    status: "CONFIRMED",
    startsAt: ct("2026-09-13T13:00:00"),
    endsAt: ct("2026-09-13T16:00:00"),
    city: "Fort Smith",
    venueName: "Fort Smith Convention Center",
    streetAddress: "55 South 7th Street",
    postalCode: "72901",
    locationDisclosure: "EXACT",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    candidateAttendance: true,
    expectedAttendance: null,
    campaignDescription:
      "Large River Valley campaign rally featuring candidate tables, community organizations, live music, concessions, and formal candidate remarks. Kelly Grappe is included in the announced speaker lineup. Organizers expect more than 1,000 attendees, but that figure is an organizer estimate rather than verified attendance.",
    privateNotes: notes(
      "river-valley-choice-rally-2026-09-13",
      "Organizer: Guzman for Arkansas campaign\nKelly role: Scheduled speaker (confirmed)\nAdmission: Free · RSVP: Not required\nSchedule: Community fair/entertainment 1:00–2:00 · Formal program 2:00–4:00 · Primary block 1:00–4:00\nOrganizer attendance estimate >1000: ESTIMATE ONLY — not actualAttendance\nSource: River Valley Has A Choice Press Release.pdf (reference — attach when file available on H:)\nFollow-up tasks (do not auto-send): Send high-res Kelly headshot; share press release with media/PR; promote via email/social; confirm comms-list contacts; await speaker logistics/day-of schedule.",
    ),
  },
];

const STAGED = [
  {
    draftId: "draft_pass3_gcal_unresolved_2026-08-08",
    status: "READY_FOR_REVIEW",
    basic: {
      primaryCalendar: "Public Events",
      additionalCalendars: [],
      eventType: "Other",
      internalTitle: "Google Calendar Event — Details Unresolved",
      campaignDisplayTitle: "Google Calendar Event — Details Unresolved",
      priority: "Normal",
      confirmationStatus: "Hold",
    },
    timing: {
      timezone: "America/Chicago",
      dateKey: "2026-08-08",
      startsAtLocal: "UNKNOWN",
      endsAtLocal: "UNKNOWN",
    },
    location: { state: "Arkansas", locationDisclosure: "CITY" },
    people: {},
    objectives: {
      summary:
        "Opaque Google Calendar template link does not expose title/time/location. Do not infer Hope Watermelon Festival or any other event from prior planning notes.",
    },
    programFlow: [],
    packingItems: [],
    staffing: [],
    preEventActions: [],
    eventDayActions: [],
    postEventActions: [],
    communicationsPlan: [],
    travelPlan: {},
    visibility: {
      locationDisclosure: "CITY",
      generalVisibility: "Campaign-wide limited",
      showCalendarName: true,
      showSafeTitle: true,
      showGeneralLocation: false,
      showStartEnd: false,
      hideProtectedDetails: true,
    },
    aiSuggestionsApplied: [],
    databaseWriteAttempted: false,
    liveCalendar: false,
    pass3Meta: {
      statusConcept: "STAGED_UNKNOWN",
      sourceOwner: "kelly@kellygrappe.com",
      googleCalendarTemplateUrl: OPAQUE_GCAL_2,
      doNotPublishUntil: "title and time resolved",
    },
  },
];

const proof = {
  pass: PASS,
  generatedAt: new Date().toISOString(),
  featureFreeze: "honored",
  aiBehaviorAdded: "NONE",
  drillDownPagesAdded: "NONE",
  eventsCreated: [],
  eventsUpdated: [],
  eventsRestored: [],
  eventsStaged: [],
  conflicts: [
    {
      a: "fundraiser-bramlett-2026-08-02",
      b: "faulkner-dem-fundraiser-2026-08-02",
      overlap: "2026-08-02 17:00–19:00 America/Chicago",
      note: "Confirmed vs HOLD/tentative — do not auto-resolve",
    },
  ],
  opaqueGoogleLinks: {
    url1: OPAQUE_GCAL_1,
    url2: OPAQUE_GCAL_2,
    inventedFields: false,
  },
};

async function upsertLive(actorUser, bySlug, spec) {
  const calendar = bySlug[spec.calendarSlug];
  if (!calendar) throw new Error(`Missing calendar ${spec.calendarSlug}`);

  let existing = await findByKey(spec.key);
  const data = {
    internalTitle: spec.internalTitle,
    campaignDisplayTitle: spec.campaignDisplayTitle,
    restrictedDisplayTitle: spec.restrictedDisplayTitle ?? null,
    eventType: spec.eventType,
    status: spec.status,
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    isAllDay: Boolean(spec.isAllDay),
    timezone: "America/Chicago",
    city: spec.city ?? null,
    venueName: spec.venueName ?? null,
    streetAddress: spec.streetAddress ?? null,
    postalCode: spec.postalCode ?? null,
    locationDisclosure: spec.locationDisclosure,
    defaultVisibility: spec.defaultVisibility,
    sensitivityLevel: spec.sensitivityLevel ?? "NORMAL",
    candidateRole: spec.candidateRole ?? null,
    candidateAttendance:
      spec.candidateAttendance === undefined ? null : spec.candidateAttendance,
    expectedAttendance: spec.expectedAttendance ?? null,
    campaignDescription: spec.campaignDescription ?? null,
    privateNotes: spec.privateNotes,
    primaryCalendarId: calendar.id,
    /** Never put Meet URLs here — restricted notes only */
    virtualMeetingUrl: null,
  };

  if (existing) {
    const wasCancelled = existing.status === "CANCELLED";
    const updated = await prisma.$transaction(async (tx) => {
      const event = await tx.event.update({
        where: { id: existing.id },
        data: { ...data, version: { increment: 1 } },
      });
      if (wasCancelled) {
        await tx.eventStatusHistory.create({
          data: {
            eventId: event.id,
            fromStatus: "CANCELLED",
            toStatus: event.status,
            changedByUserId: actorUser.id,
            reason: `Restored by ${PASS} newer evidence`,
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorUser.id,
            actorType: "USER",
            action: "EVENT_RESTORED",
            entityType: "Event",
            entityId: event.id,
            source: "operator-ingest-pass3",
            reason: `Restored from newer evidence (${PASS})`,
            newStateRedacted: { eventNumber: event.eventNumber, ingestKey: spec.key },
          },
        });
      }
      return event;
    });
    const bucket = wasCancelled ? proof.eventsRestored : proof.eventsUpdated;
    bucket.push({
      key: spec.key,
      eventNumber: updated.eventNumber,
      status: updated.status,
    });
    console.log(
      `${wasCancelled ? "RESTORED" : "UPDATED"}: ${spec.key} → ${updated.eventNumber}`,
    );
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
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
        reason: `Operator ingest ${PASS}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorUser.id,
        actorType: "USER",
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: event.id,
        source: "operator-ingest-pass3",
        reason: PASS,
        newStateRedacted: {
          eventNumber: event.eventNumber,
          ingestKey: spec.key,
          status: event.status,
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

function writeStaged() {
  const dir = path.join(root, "data", "ingest_staging", "drafts");
  fs.mkdirSync(dir, { recursive: true });
  for (const draft of STAGED) {
    const file = path.join(dir, `${draft.draftId}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          ...draft,
          draftVersion: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    proof.eventsStaged.push({ draftId: draft.draftId });
    console.log(`STAGED: ${draft.draftId}`);
  }
}

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
  for (const s of slugs) {
    if (!bySlug[s]) throw new Error(`Calendar missing: ${s}`);
  }

  console.log(`--- ${PASS} live upserts ---`);
  for (const spec of LIVE_EVENTS) {
    await upsertLive(actorUser, bySlug, spec);
  }

  /** Conceptual restore: Pass-1 HSV keys remain CANCELLED; Pass-3 keys are the live authority. */
  const hsvSupersededKeys = [
    "depart-hsv-after-work-2026-07-22",
    "lodging-hsv-wed-2026-07-22",
    "kelly-work-hsv-2026-07-23",
  ];
  const hsvLiveKeys = [
    "travel-hsv-2026-07-22",
    "lodging-hsv-deb-bryan-2026-07-22",
    "kelly-work-hsv-remote-2026-07-23",
    "hsv-democrats-kelly-2026-07-23",
  ];
  for (const oldKey of hsvSupersededKeys) {
    const old = await findByKey(oldKey);
    if (old && old.status === "CANCELLED") {
      const note = `\n[supersededByPass:${PASS}] Replaced by live Pass-3 HSV itinerary keys: ${hsvLiveKeys.join(", ")}`;
      if (!old.privateNotes?.includes(`[supersededByPass:${PASS}]`)) {
        await prisma.event.update({
          where: { id: old.id },
          data: { privateNotes: `${old.privateNotes ?? ""}${note}` },
        });
      }
      if (!proof.eventsRestored.some((r) => r.supersededKey === oldKey)) {
        proof.eventsRestored.push({
          supersededKey: oldKey,
          supersededEventNumber: old.eventNumber,
          restoredViaKeys: hsvLiveKeys,
          note: "Newer email evidence restored HSV itinerary as distinct Pass-3 keys; Pass-1 rows remain CANCELLED",
        });
      }
    }
  }

  console.log(`--- ${PASS} staged ---`);
  writeStaged();

  const sourceRefDir = path.join(root, "develop_notes", "source_references");
  fs.mkdirSync(sourceRefDir, { recursive: true });
  const pressRef = path.join(sourceRefDir, "river-valley-has-a-choice-press-release.md");
  if (!fs.existsSync(pressRef)) {
    fs.writeFileSync(
      pressRef,
      [
        "# Source reference — River Valley Has A Choice Press Release",
        "",
        "**Filename (operator-supplied):** `River Valley Has A Choice Press Release.pdf`",
        "**Indexed event:** `river-valley-choice-rally-2026-09-13`",
        "**Indexed date:** Sunday, September 13, 2026",
        "",
        "Provenance: email / attached press release referenced in Pass 3 ingest.",
        "Do not treat organizer attendance estimates as verified attendance.",
        "PDF binary may live outside git; this file is the durable index only.",
        "",
      ].join("\n"),
    );
  }

  const out = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "operator-pass3-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, out)}`);
  console.log(
    JSON.stringify(
      {
        created: proof.eventsCreated.length,
        updated: proof.eventsUpdated.length,
        restored: proof.eventsRestored.length,
        staged: proof.eventsStaged.length,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
