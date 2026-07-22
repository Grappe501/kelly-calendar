/**
 * KCCC LIVE CALENDAR INGEST PASS 2
 * July 19–24, 2026 · confirmed events only · Feature Freeze honored
 *
 * - Idempotent upsert by [ingestKey:…] in privateNotes
 * - Supersedes earlier Carroll County / later-week plans via CANCELLED + audit
 * - Time-unknown speaking / return blocks stay staged (drafts), not fabricated live times
 * - Never prints secrets or farm street addresses to stdout/proof git artifacts
 *
 * Usage: npm run events:ingest:operator-week
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "PASS2-2026-07-19";
const SUPERSESSION_REASON =
  "Pass 2 operator supersession: Sunday night Blytheville; Monday events; return farm Monday evening; Kelly works Little Rock Tuesday; no Carroll County / no other July stops at this point.";

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

/** Earlier Pass-1 plans superseded by Pass 2 authority — cancel, do not delete. */
const SUPERSEDE_KEYS = [
  "farm-depart-carroll-prep-2026-07-20",
  "carroll-dems-picnic-2026-07-21",
  "return-farm-late-2026-07-21",
  "depart-hsv-after-work-2026-07-22",
  "lodging-hsv-wed-2026-07-22",
  "kelly-work-hsv-2026-07-23",
  "lodging-farm-thu-2026-07-23",
  "steve-fasting-start-2026-07-23",
  "steve-procedure-2026-07-24",
  "cave-city-watermelon-2026-07-25",
  "lodging-batesville-sat-2026-07-25",
  // Blytheville Jul 26 church day + forum restored by operator (madison-travel-blytheville ingest).
  // Do not re-cancel on re-run of this Pass-2 script.
  /** Fabricated 6:00 PM — Pass 2 requires UNKNOWN time → stage draft instead */
  "naacp-steve-jonesboro-2026-07-20",
];

/** Live calendar upserts (confirmed enough to publish without inventing clock times). */
const LIVE_EVENTS = [
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
      "Host home (Judge Humphries). Street address not stored in git. Followed by Blytheville overnight.",
    ),
  },
  {
    key: "overnight-blytheville-2026-07-19",
    calendarSlug: "travel",
    internalTitle: "Overnight in Blytheville",
    campaignDisplayTitle: "Overnight in Blytheville",
    eventType: "Travel block",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-19T19:00:00"),
    endsAt: chicagoLocalToDate("2026-07-20T08:00:00"),
    city: "Blytheville",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    privateNotes: notes(
      "overnight-blytheville-2026-07-19",
      "Campaign overnight in Blytheville following the Dr. Chris Jones fundraiser. Lodging details are not yet recorded.\nLodging venue: UNKNOWN\nHotel/reservation: UNKNOWN\nEnd 8:00 AM = lodging block end, not confirmed checkout clock.",
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
      "Internet technician appointment at farm 8:00–10:00 AM.\nDATA QUALITY: Overlaps Don Henry consultation 8:30–10:00.\nDATA QUALITY: Blytheville overnight block ends 8:00 AM same morning — travel/availability conflict; do not auto-resolve.",
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
      "Don Henry — walk property / farm cleanup plan. Block 8:30–11:00 AM (operator).\nDATA QUALITY: Potential overlap with internet install 8:30–10:00 — surface only; do not move.",
    ),
  },
  {
    key: "england-dems-kelly-2026-07-20",
    calendarSlug: "public-events",
    internalTitle: "Kelly Speaks — England Democratic Meeting",
    campaignDisplayTitle: "Kelly Speaks — England Democratic Meeting",
    eventType: "Speaking Engagement",
    status: "CONFIRMED",
    startsAt: chicagoLocalToDate("2026-07-20T17:30:00"),
    /**
     * End time UNKNOWN. Schema requires endsAt > startsAt — use +1 minute
     * as a non-authoritative placeholder only (documented in privateNotes).
     */
    endsAt: chicagoLocalToDate("2026-07-20T17:31:00"),
    city: "England",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateRole: "SPEAKING",
    privateNotes: notes(
      "england-dems-kelly-2026-07-20",
      "Kelly Grappe speaks at England Democrats. Start CONFIRMED 5:30 PM CT.\nEnd time: UNKNOWN\nVenue: UNKNOWN\nStreet address: UNKNOWN\nSchema note: endsAt is start+1min placeholder only — NOT a confirmed duration.\nAfter event: return to farm (see staged return draft).\nSpeaker: Kelly Grappe · Organization: England Democrats",
    ),
  },
  {
    key: "kelly-work-littlerock-2026-07-21",
    calendarSlug: "protected-personal",
    internalTitle: "Kelly Working in Little Rock",
    campaignDisplayTitle: "Personal — working Little Rock",
    restrictedDisplayTitle: "Unavailable",
    eventType: "Protected personal block",
    status: "CONFIRMED",
    isAllDay: true,
    startsAt: chicagoLocalToDate("2026-07-21T00:00:00"),
    endsAt: chicagoLocalToDate("2026-07-21T23:59:59"),
    city: "Little Rock",
    locationDisclosure: "CITY",
    defaultVisibility: "BUSY_ONLY",
    privateNotes: notes(
      "kelly-work-littlerock-2026-07-21",
      "Kelly is working in Little Rock Tuesday. Exact work hours and site not recorded for this Pass 2 live row (all-day busy).\nOperator standing pattern (not asserted as this day's clock): Mon–Fri often 8–12 and 1–5; Tue/Fri often try Little Rock office when scheduled — may override.\nStreet address: not stored in git artifacts.",
    ),
  },
  {
    key: "cave-city-christy-low-2026-07-24",
    calendarSlug: "volunteer",
    internalTitle: "Cave City Watermelon Festival — Christy Low Volunteering",
    campaignDisplayTitle: "Cave City Watermelon Festival — Christy Low",
    eventType: "Festival / Volunteer Deployment",
    status: "TENTATIVE",
    /** Date confirmed Friday Jul 24; shift UNKNOWN — all-day availability marker only */
    isAllDay: true,
    startsAt: chicagoLocalToDate("2026-07-24T00:00:00"),
    endsAt: chicagoLocalToDate("2026-07-24T23:59:59"),
    city: "Cave City",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: false,
    privateNotes: notes(
      "cave-city-christy-low-2026-07-24",
      "Christy Low volunteered for campaign activity at Cave City Watermelon Festival (Friday Jul 24).\nVolunteer shift: UNKNOWN\nAssignment: UNKNOWN\nMeeting location: UNKNOWN\nKelly attendance: UNKNOWN\nSteve attendance: UNKNOWN\nAdditional volunteers: UNKNOWN\ncandidateAttending: false (not confirmed)",
    ),
  },
];

/** Staged drafts only — must not publish fabricated clock times. */
const STAGED_DRAFTS = [
  {
    draftId: "draft_pass2_naacp_steve_jonesboro",
    status: "READY_FOR_REVIEW",
    basic: {
      primaryCalendar: "Public Events",
      additionalCalendars: [],
      eventType: "Speaking Engagement",
      internalTitle: "Steve Speaks — Jonesboro NAACP Voter Registration and Deployment",
      campaignDisplayTitle: "Steve Speaks — Jonesboro NAACP Voter Registration and Deployment",
      priority: "High",
      confirmationStatus: "Hold",
    },
    timing: {
      timezone: "America/Chicago",
      allDay: false,
      dateKey: "2026-07-20",
      startsAtLocal: "UNKNOWN",
      endsAtLocal: "UNKNOWN",
      startConfidence: "UNKNOWN",
      endConfidence: "UNKNOWN",
    },
    location: {
      state: "Arkansas",
      city: "Jonesboro",
      venueName: "UNKNOWN",
      locationDisclosure: "CITY",
    },
    people: {
      speaker: "Steve Grappe",
      organization: "Jonesboro Branch of the NAACP",
    },
    objectives: {
      summary:
        "Steve Grappe is scheduled to speak to the Jonesboro Branch of the NAACP about voter registration and campaign deployment. Start time, end time, and venue address remain unconfirmed.",
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
      showGeneralLocation: true,
      showStartEnd: false,
      hideProtectedDetails: true,
    },
    aiSuggestionsApplied: [],
    databaseWriteAttempted: false,
    liveCalendar: false,
    pass2Note:
      "STAGED — start/end UNKNOWN. Do not publish fabricated time. Live fabricated 6PM row superseded CANCELLED.",
  },
  {
    draftId: "draft_pass2_return_farm_after_england",
    status: "READY_FOR_REVIEW",
    basic: {
      primaryCalendar: "Travel",
      additionalCalendars: [],
      eventType: "Travel block",
      internalTitle: "Return to the Farm",
      campaignDisplayTitle: "Return to the Farm",
      priority: "Normal",
      confirmationStatus: "Hold",
    },
    timing: {
      timezone: "America/Chicago",
      allDay: false,
      dateKey: "2026-07-20",
      startsAtLocal: "UNKNOWN",
      endsAtLocal: "UNKNOWN",
      afterEvent: "england-dems-kelly-2026-07-20",
      startConfidence: "UNKNOWN",
    },
    location: {
      state: "Arkansas",
      fromCity: "England",
      toLabel: "Farm (Rose Bud area)",
      locationDisclosure: "CITY",
    },
    people: {},
    objectives: {
      summary:
        "Return to the farm after Kelly’s England Democratic meeting. Departure and arrival times remain unknown. Farm street address is operator-known but not written into git-tracked files.",
    },
    programFlow: [],
    packingItems: [],
    staffing: [],
    preEventActions: [],
    eventDayActions: [],
    postEventActions: [],
    communicationsPlan: [],
    travelPlan: { mode: "UNKNOWN" },
    visibility: {
      locationDisclosure: "CITY",
      generalVisibility: "Campaign-wide limited",
      showCalendarName: true,
      showSafeTitle: true,
      showGeneralLocation: true,
      showStartEnd: false,
      hideProtectedDetails: true,
    },
    aiSuggestionsApplied: [],
    databaseWriteAttempted: false,
    liveCalendar: false,
    pass2Note: "STAGED — awaiting England meeting end time. Do not publish false 8:00 PM block.",
  },
];

const proof = {
  pass: PASS,
  generatedAt: new Date().toISOString(),
  featureFreeze: "honored",
  runtimeFeaturesAdded: "NONE",
  timezone: "America/Chicago",
  julyBoundaryNote:
    "Operator-entered July campaign schedule is currently complete through the known events listed in this ingest pass. Absence of records does not prove universal availability.",
  eventsCreated: [],
  eventsUpdated: [],
  eventsSuperseded: [],
  eventsStaged: [],
  eventsIntentionallyOmitted: [
    "Carroll County travel / picnic / Mon 8pm depart — superseded by Pass 2",
    "Steve NAACP live clock time — staged UNKNOWN instead",
    "Return-to-farm live clock — staged UNKNOWN instead",
    "Wed–Sun prior Pass-1 itinerary (HSV, procedure, Sat Cave City, Blytheville churches/forum)",
  ],
  conflictsSurfaced: [
    "Internet install 8:00–10:00 overlaps Don Henry consult 8:30–11:00 (8:30–10:00)",
    "Blytheville overnight ends 8:00 AM vs internet appointment at farm 8:00 AM — travel/availability conflict; not auto-resolved",
  ],
  confirmed: [],
  unknown: [],
  idempotency: { runs: [] },
};

async function findByIngestKey(key) {
  return prisma.event.findFirst({
    where: { archivedAt: null, privateNotes: { startsWith: `[ingestKey:${key}]` } },
  });
}

async function supersedeKey(actorUser, key) {
  const existing = await findByIngestKey(key);
  if (!existing) {
    proof.eventsSuperseded.push({ key, action: "absent_noop" });
    console.log(`SUPERSEDE noop: ${key} (not present)`);
    return;
  }
  if (existing.status === "CANCELLED") {
    proof.eventsSuperseded.push({
      key,
      action: "already_cancelled",
      eventNumber: existing.eventNumber,
      eventId: existing.id,
    });
    console.log(`SUPERSEDE already: ${key} → ${existing.eventNumber}`);
    return;
  }
  const updated = await prisma.$transaction(async (tx) => {
    const event = await tx.event.update({
      where: { id: existing.id },
      data: {
        status: "CANCELLED",
        privateNotes: `${existing.privateNotes ?? `[ingestKey:${key}]`}\n[SUPERSEDED:${PASS}]\n${SUPERSESSION_REASON}`,
        version: { increment: 1 },
      },
    });
    await tx.eventStatusHistory.create({
      data: {
        eventId: event.id,
        fromStatus: existing.status,
        toStatus: "CANCELLED",
        changedByUserId: actorUser.id,
        reason: SUPERSESSION_REASON,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorUser.id,
        actorType: "USER",
        action: "EVENT_SUPERSEDED",
        entityType: "Event",
        entityId: event.id,
        source: "operator-week-ingest-pass2",
        reason: SUPERSESSION_REASON,
        previousStateRedacted: { status: existing.status, eventNumber: existing.eventNumber },
        newStateRedacted: { status: "CANCELLED", ingestKey: key, pass: PASS },
      },
    });
    return event;
  });
  proof.eventsSuperseded.push({
    key,
    action: "cancelled",
    eventNumber: updated.eventNumber,
    eventId: updated.id,
  });
  console.log(`SUPERSEDED: ${key} → ${updated.eventNumber} CANCELLED`);
}

async function upsertLive(actorUser, bySlug, spec) {
  const calendar = bySlug[spec.calendarSlug];
  if (!calendar) throw new Error(`Calendar missing: ${spec.calendarSlug}`);

  let existing = await findByIngestKey(spec.key);
  if (!existing && spec.legacyTitles?.length) {
    existing = await prisma.event.findFirst({
      where: {
        archivedAt: null,
        primaryCalendarId: calendar.id,
        internalTitle: { in: spec.legacyTitles },
        status: { not: "CANCELLED" },
      },
    });
  }

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
      eventId: updated.id,
      status: updated.status,
    });
    console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
    return { action: "updated", event: updated };
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
        reason: `Operator week ingest ${PASS}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actorUser.id,
        actorType: "USER",
        action: "EVENT_CREATED",
        entityType: "Event",
        entityId: event.id,
        source: "operator-week-ingest-pass2",
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
    eventId: created.id,
    status: created.status,
  });
  console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
  return { action: "created", event: created };
}

function writeStagedDrafts() {
  const dir = path.join(root, "data", "ingest_staging", "drafts");
  fs.mkdirSync(dir, { recursive: true });
  for (const draft of STAGED_DRAFTS) {
    const file = path.join(dir, `${draft.draftId}.json`);
    const payload = {
      ...draft,
      draftVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      programFlow: draft.programFlow ?? [],
      packingItems: draft.packingItems ?? [],
      staffing: draft.staffing ?? [],
      preEventActions: draft.preEventActions ?? [],
      eventDayActions: draft.eventDayActions ?? [],
      postEventActions: draft.postEventActions ?? [],
      communicationsPlan: draft.communicationsPlan ?? [],
      travelPlan: draft.travelPlan ?? {},
      aiSuggestionsApplied: [],
      databaseWriteAttempted: false,
      liveCalendar: false,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    proof.eventsStaged.push({ draftId: draft.draftId, file: path.relative(root, file) });
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
  for (const slug of slugs) {
    if (!bySlug[slug]) throw new Error(`Calendar missing: ${slug}`);
  }

  console.log(`--- ${PASS} supersessions ---`);
  for (const key of SUPERSEDE_KEYS) {
    await supersedeKey(actorUser, key);
  }

  console.log(`--- ${PASS} live upserts ---`);
  for (const spec of LIVE_EVENTS) {
    await upsertLive(actorUser, bySlug, spec);
  }

  console.log(`--- ${PASS} staged drafts ---`);
  writeStagedDrafts();

  proof.confirmed = [
    "Fundraiser Jul 19 5–7pm",
    "Blytheville overnight Jul 19 7pm – Jul 20 8am (lodging venue UNKNOWN)",
    "Internet install Jul 20 8–10am",
    "Don Henry consult Jul 20 8:30–11am",
    "Kelly England speaking start Jul 20 5:30pm",
    "Kelly working Little Rock Jul 21 (all-day busy; hours UNKNOWN for live row)",
    "Christy Low Cave City volunteer date Fri Jul 24 (shift UNKNOWN)",
  ];
  proof.unknown = [
    "Blytheville lodging venue/hotel",
    "Steve NAACP start/end/venue (staged)",
    "England meeting end/venue",
    "Return-to-farm depart/arrive (staged)",
    "Kelly LR Tuesday exact hours/site for Pass 2 live row",
    "Cave City shift/assignment/Kelly|Steve attendance",
  ];

  const activeLive = await prisma.event.findMany({
    where: {
      archivedAt: null,
      status: { not: "CANCELLED" },
      privateNotes: { contains: `[pass:${PASS}]` },
    },
    select: { eventNumber: true, internalTitle: true, status: true },
    orderBy: { startsAt: "asc" },
  });
  proof.activePass2LiveCount = activeLive.length;
  proof.activePass2Live = activeLive.map((e) => ({
    eventNumber: e.eventNumber,
    title: e.internalTitle,
    status: e.status,
  }));

  const outPath = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "operator-week-ingest-latest.json",
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(proof, null, 2));
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(`PASS: active Pass-2 live events: ${activeLive.length}`);
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
