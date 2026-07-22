/**
 * September operator batch (2026):
 * Madison return · Howard County · Russellville/HSV · Sherwood rally ·
 * Comic Con · Arkadelphia churches · Press Freedom Gala · Paragould note
 *
 * Usage: npm run events:ingest:sep-operator-batch
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "SEP-OPERATOR-BATCH-2026-09";
const PLAN_REL = "develop_notes/KCCC_GRASSROOTS_GUITAR_STRINGS_SEP17_2026_PLAN.md";

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

async function patchNotes(key, text) {
  const existing = await findByIngestKey(key);
  if (!existing) {
    console.warn(`WARN: missing ${key} for note patch`);
    return null;
  }
  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: { privateNotes: notes(key, text), version: { increment: 1 } },
  });
  console.log(`PATCHED: ${key} → ${updated.eventNumber}`);
  return updated;
}

const SPECS = [
  // ── Madison return Sep 3 ───────────────────────────────────────────
  {
    key: "return-madison-rosebud-2026-09-03",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Return Madison County → Rose Bud",
      campaignDisplayTitle: "Return to Rose Bud (from Madison)",
      eventType: "Travel / Return Home",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-03T20:00:00"),
      endsAt: chicagoLocalToDate("2026-09-03T23:00:00"),
      city: "Rose Bud",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "return-madison-rosebud-2026-09-03",
        [
          "SOURCE: Operator — Sep 3 return from Madison County to Rose Bud 8:00–11:00 PM CT.",
          "AFTER: madison-county-2026-09-03 + lodging-madison-airbnb-2026-09-02.",
          "Soft travel window — exact depart after program TBD.",
        ].join("\n"),
      ),
    },
  },

  // ── Howard County week (Sep 7–10) ──────────────────────────────────
  {
    key: "travel-nashville-howard-2026-09-07",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Nashville (Howard County)",
      campaignDisplayTitle: "Travel to Nashville, AR",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-07T16:00:00"),
      endsAt: chicagoLocalToDate("2026-09-07T20:00:00"),
      city: "Nashville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-nashville-howard-2026-09-07",
        [
          "SOURCE: Operator — Sep 7 travel to Nashville, Arkansas for Howard County Dem Meeting next day.",
          "SUPPORT for howard-county-dem-meeting-2026-09-08.",
          "Lodging Nashville area TBD overnight — do not invent property.",
          "VERIFY vs howard-county-dem-meeting-2026-09-10 (same-day drive version) — operator may intend one meeting only.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "lodging-nashville-howard-2026-09-07",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Overnight lodging – Nashville / Howard County",
      campaignDisplayTitle: "Overnight – Nashville, AR",
      eventType: "Travel / Lodging",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-07T20:00:00"),
      endsAt: chicagoLocalToDate("2026-09-08T16:00:00"),
      city: "Nashville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "lodging-nashville-howard-2026-09-07",
        [
          "SUPPORT for howard-county-dem-meeting-2026-09-08 (5:30–7:00 PM).",
          "Property TBD — do not invent address.",
          "AFTER meeting: return-nashville-littlerock-2026-09-08.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "howard-county-dem-meeting-2026-09-08",
    calendarSlug: "county-activity",
    createStatus: "HOLD",
    data: {
      internalTitle: "Howard County Democratic Meeting – Nashville",
      campaignDisplayTitle: "Howard County Dem Meeting",
      eventType: "County Party Meeting",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-08T17:30:00"),
      endsAt: chicagoLocalToDate("2026-09-08T19:00:00"),
      city: "Nashville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "howard-county-dem-meeting-2026-09-08",
        [
          "SOURCE: Operator — Howard County Dem Meeting Sep 8 5:30–7:00 PM Nashville, AR.",
          "Venue TBD — do not invent.",
          "ARRIVAL: travel-nashville-howard-2026-09-07 + lodging-nashville-howard-2026-09-07.",
          "AFTER: return-nashville-littlerock-2026-09-08.",
          "OPEN: Also listed howard-county-dem-meeting-2026-09-10 (same-day drive). Confirm if Sep 8, Sep 10, or both.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "return-nashville-littlerock-2026-09-08",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Return Nashville → Little Rock",
      campaignDisplayTitle: "Return to Little Rock (from Nashville)",
      eventType: "Travel / Mission Transition",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-08T19:00:00"),
      endsAt: chicagoLocalToDate("2026-09-08T22:00:00"),
      city: "Little Rock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "return-nashville-littlerock-2026-09-08",
        [
          "SOURCE: Operator — after Howard County Dem Meeting, return to Little Rock.",
          "Soft evening window after 7:00 PM meeting end.",
          "Positions kelly-work-lr-2026-09-09 (Wednesday LR work this week only).",
        ].join("\n"),
      ),
    },
  },
  {
    key: "kelly-work-lr-2026-09-09",
    calendarSlug: "staff-work",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Kelly works Little Rock (Wed exception this week)",
      campaignDisplayTitle: "Kelly – Little Rock work day",
      eventType: "Staff / Work Location",
      status: "CONFIRMED",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-09T08:00:00"),
      endsAt: chicagoLocalToDate("2026-09-09T17:00:00"),
      isAllDay: false,
      city: "Little Rock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "kelly-work-lr-2026-09-09",
        [
          "SOURCE: Operator — this week only: Kelly works from Little Rock on Wednesday instead of Tuesday.",
          "Tue Sep 8 = Howard County Dem Meeting day (not LR work).",
          "One-week exception — do not treat as standing schedule change.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "kelly-leave-work-howard-2026-09-10",
    calendarSlug: "staff-work",
    createStatus: "HOLD",
    data: {
      internalTitle: "Kelly leave work early (Howard County drive)",
      campaignDisplayTitle: "Kelly leave work 4:00 PM",
      eventType: "Staff / Work Location",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-10T16:00:00"),
      endsAt: chicagoLocalToDate("2026-09-10T16:30:00"),
      city: "Little Rock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "kelly-leave-work-howard-2026-09-10",
        [
          "SOURCE: Operator — Kelly takes off work at 4:00 PM for same-day Howard County Dem Meeting drive.",
          "SUPPORT for howard-county-dem-meeting-2026-09-10 + travel-howard-roundtrip-2026-09-10.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "travel-howard-roundtrip-2026-09-10",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Howard County round-trip (Nashville) — same day",
      campaignDisplayTitle: "Drive to Nashville & back (same day)",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-10T16:00:00"),
      endsAt: chicagoLocalToDate("2026-09-10T22:30:00"),
      city: "Nashville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-howard-roundtrip-2026-09-10",
        [
          "SOURCE: Operator — Sep 10 drive over and back same day for Howard County Dem Meeting 6:00 PM.",
          "Leave work 4:00 PM. No overnight.",
          "OPEN: Verify vs Sep 8 overnight Howard meeting — may be duplicate date error.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "howard-county-dem-meeting-2026-09-10",
    calendarSlug: "county-activity",
    createStatus: "HOLD",
    data: {
      internalTitle: "Howard County Democratic Meeting – Nashville",
      campaignDisplayTitle: "Howard County Dem Meeting",
      eventType: "County Party Meeting",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-10T18:00:00"),
      endsAt: chicagoLocalToDate("2026-09-10T19:30:00"),
      city: "Nashville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "howard-county-dem-meeting-2026-09-10",
        [
          "SOURCE: Operator — Sep 10 6:00 PM Howard County Dem Meeting; same-day drive.",
          "Venue TBD. Soft end 7:30 until locked.",
          "OPEN: Also listed Sep 8 5:30–7:00 overnight version — confirm which date is real (or both).",
        ].join("\n"),
      ),
    },
  },

  // ── Sep 15 Russellville + HSV lodging conflict ─────────────────────
  {
    key: "russellville-voter-reg-mary-ella-2026-09-15",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Russellville – Voter Registration with Mary Ella",
      campaignDisplayTitle: "Russellville Voter Registration (Mary Ella)",
      eventType: "Voter Registration / Field",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-15T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-15T23:59:00"),
      isAllDay: true,
      city: "Russellville",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "russellville-voter-reg-mary-ella-2026-09-15",
        [
          "SOURCE: Operator — Sep 15 blocked all day Russellville with Mary Ella — Voter Registration event.",
          "Contact: Mary Ella (Pope County Dems / CRM) — phone/email never commit.",
          "CONFLICT PRESSURE: lodging-hsv-2026-09-15 + travel-hsv-after-work-2026-09-15 (drive to HSV after work for Sep 16 forum).",
          "Operator must reconcile all-day Russellville vs evening HSV positioning — do not auto-resolve.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "travel-hsv-after-work-2026-09-15",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Hot Springs Village (after work)",
      campaignDisplayTitle: "Travel to Hot Springs Village",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-15T17:00:00"),
      endsAt: chicagoLocalToDate("2026-09-15T19:30:00"),
      city: "Hot Springs Village",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-hsv-after-work-2026-09-15",
        [
          "SOURCE: Operator — drive up after work Tue Sep 15 for HSV lodging before Wed forum.",
          "SUPPORT for lodging-hsv-2026-09-15 + hsv-candidate-forum-2026-09-16.",
          "CONFLICT: russellville-voter-reg-mary-ella-2026-09-15 is all-day blocked — reconcile geography/time.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "lodging-hsv-2026-09-15",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Overnight lodging – Hot Springs Village",
      campaignDisplayTitle: "Overnight – Hot Springs Village",
      eventType: "Travel / Lodging",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-15T19:30:00"),
      endsAt: chicagoLocalToDate("2026-09-16T13:00:00"),
      city: "Hot Springs Village",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "lodging-hsv-2026-09-15",
        [
          "SOURCE: Operator — stay HSV Tuesday night Sep 15 for Wednesday candidate forum.",
          "Property TBD — do not invent.",
          "SUPPORT for hsv-candidate-forum-2026-09-16.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "kelly-vacation-hsv-forum-2026-09-16",
    calendarSlug: "staff-work",
    createStatus: "CONFIRMED",
    data: {
      internalTitle: "Kelly vacation day (HSV Candidate Forum)",
      campaignDisplayTitle: "Kelly – vacation day",
      eventType: "Staff / Leave",
      status: "CONFIRMED",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-16T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-16T23:59:00"),
      isAllDay: true,
      locationDisclosure: "HIDDEN",
      defaultVisibility: "BUSY_ONLY",
      restrictedDisplayTitle: "Unavailable",
      candidateAttendance: true,
      privateNotes: notes(
        "kelly-vacation-hsv-forum-2026-09-16",
        [
          "SOURCE: Operator — Kelly takes vacation day Wed Sep 16 for HSV Candidate Forum.",
          "Pairs with hsv-candidate-forum-2026-09-16.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "hsv-candidate-forum-2026-09-16",
    calendarSlug: "public-events",
    createStatus: "HOLD",
    data: {
      internalTitle: "Hot Springs Village Candidate Forum",
      campaignDisplayTitle: "Hot Springs Village Candidate Forum",
      eventType: "Campaign Candidate Forum / Speaking Engagement",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-16T14:00:00"),
      endsAt: chicagoLocalToDate("2026-09-16T16:00:00"),
      city: "Hot Springs Village",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "hsv-candidate-forum-2026-09-16",
        [
          "SOURCE: Operator — Sep 16 2:00 PM Hot Springs Village Candidate Forum.",
          "Soft end 4:00 PM until program locked. Venue TBD.",
          "Kelly vacation day: kelly-vacation-hsv-forum-2026-09-16.",
          "ARRIVAL: lodging-hsv-2026-09-15 (Tue night).",
        ].join("\n"),
      ),
    },
  },

  // ── Sep 17 Sherwood rally ──────────────────────────────────────────
  {
    key: "grassroots-guitar-strings-sherwood-2026-09-17",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Grassroots and Guitar Strings – Sherwood Rally",
      campaignDisplayTitle: "Grassroots & Guitar Strings Rally (Sherwood)",
      eventType: "Campaign Rally / Hometown Community Event",
      status: "HOLD",
      priority: "Critical",
      startsAt: chicagoLocalToDate("2026-09-17T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-17T23:59:00"),
      isAllDay: true,
      city: "Sherwood",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "grassroots-guitar-strings-sherwood-2026-09-17",
        [
          "SOURCE: Operator — Big hometown rally with David Adam Byrnes. Sherwood, AR.",
          "COMMITTEE CHAIRS: Jay Powell · Christy Low.",
          "PLAN GUIDE: develop_notes/KCCC_GRASSROOTS_GUITAR_STRINGS_SEP17_2026_PLAN.md",
          "Clock/venue/run-of-show TBD — all-day block until locked.",
          "High production event — treat as Tier 1 rally build.",
        ].join("\n"),
      ),
    },
  },

  // ── Sep 19 Comic Con + late travel Arkadelphia ─────────────────────
  {
    key: "comic-con-littlerock-table-2026-09-19",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Little Rock Comic Con – Campaign Table",
      campaignDisplayTitle: "Comic Con table (Little Rock)",
      eventType: "Community Festival / Tabling",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-19T12:00:00"),
      endsAt: chicagoLocalToDate("2026-09-19T18:00:00"),
      city: "Little Rock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "comic-con-littlerock-table-2026-09-19",
        [
          "SOURCE: Operator — Comic Con Little Rock; table in the afternoon with Kelly's cousin Mike.",
          "Soft afternoon window 12:00–6:00 until booth assignment locks.",
          "Materials: push cards, signs, shirts, signup — packing list TBD.",
          "Cousin Mike contact in CRM only.",
          "SAME EVENING: travel-arkadelphia-2026-09-19 late Saturday night for Sunday church tours.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "travel-arkadelphia-2026-09-19",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Travel to Arkadelphia (late Saturday)",
      campaignDisplayTitle: "Travel to Arkadelphia",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-19T20:00:00"),
      endsAt: chicagoLocalToDate("2026-09-19T22:30:00"),
      city: "Arkadelphia",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "travel-arkadelphia-2026-09-19",
        [
          "SOURCE: Operator — travel to Arkadelphia late Saturday night after Comic Con tabling.",
          "SUPPORT for lodging-arkadelphia-2026-09-19 + arkadelphia-church-tours-2026-09-20.",
          "Guide: Bruce Bell (CRM) — multiple church visits Sunday.",
        ].join("\n"),
      ),
    },
  },
  {
    key: "lodging-arkadelphia-2026-09-19",
    calendarSlug: "travel",
    createStatus: "HOLD",
    data: {
      internalTitle: "Overnight lodging – Arkadelphia",
      campaignDisplayTitle: "Overnight – Arkadelphia",
      eventType: "Travel / Lodging",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-19T22:30:00"),
      endsAt: chicagoLocalToDate("2026-09-20T08:00:00"),
      city: "Arkadelphia",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "lodging-arkadelphia-2026-09-19",
        [
          "SOURCE: Operator — find lodging Arkadelphia Saturday night.",
          "Property TBD — do not invent. Book before Comic Con weekend if possible.",
          "SUPPORT for arkadelphia-church-tours-2026-09-20 (Bruce Bell guide).",
        ].join("\n"),
      ),
    },
  },
  {
    key: "arkadelphia-church-tours-2026-09-20",
    calendarSlug: "field",
    createStatus: "HOLD",
    data: {
      internalTitle: "Arkadelphia church tours (Bruce Bell)",
      campaignDisplayTitle: "Arkadelphia church tours",
      eventType: "Faith Community Engagement",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-20T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-20T23:59:00"),
      isAllDay: true,
      city: "Arkadelphia",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "arkadelphia-church-tours-2026-09-20",
        [
          "SOURCE: Operator — full day church tours in Arkadelphia.",
          "GUIDE: Bruce Bell — multiple church visits set up (itinerary in CRM / with Bruce).",
          "ARRIVAL: travel-arkadelphia-2026-09-19 + lodging-arkadelphia-2026-09-19.",
          "Do not invent church names or addresses until Bruce's list is locked into notes.",
          "Continuity with clark-county-meeting-arkadelphia-2026-08-27.",
        ].join("\n"),
      ),
    },
  },

  // ── Sep 22 Press Freedom Gala ──────────────────────────────────────
  {
    key: "press-freedom-gala-littlerock-2026-09-22",
    calendarSlug: "public-events",
    createStatus: "HOLD",
    data: {
      internalTitle: "Press Freedom Gala – Little Rock",
      campaignDisplayTitle: "Press Freedom Gala",
      eventType: "Civic Gala / Community Event",
      status: "HOLD",
      priority: "High",
      startsAt: chicagoLocalToDate("2026-09-22T00:00:00"),
      endsAt: chicagoLocalToDate("2026-09-22T23:59:00"),
      isAllDay: true,
      city: "Little Rock",
      state: "Arkansas",
      locationDisclosure: "CITY",
      defaultVisibility: "TITLE_LOCATION",
      candidateAttendance: true,
      privateNotes: notes(
        "press-freedom-gala-littlerock-2026-09-22",
        [
          "SOURCE: Operator — Press Freedom Gala Little Rock. All day set aside pending details.",
          "Venue, clock, dress, tickets, speaking role TBD — waiting for more details.",
          "Do not invent program.",
        ].join("\n"),
      ),
    },
  },
];

const proof = {
  pass: PASS,
  events: [],
  conflictsSurfaced: [
    "russellville-voter-reg-mary-ella-2026-09-15 (all day) ∩ travel/lodging HSV evening Sep 15",
    "howard-county-dem-meeting-2026-09-08 ∩ howard-county-dem-meeting-2026-09-10 (verify which date)",
  ],
  openDecisions: [
    "Howard County Dem: Sep 8 overnight, Sep 10 same-day, or both?",
    "Reconcile Sep 15 Russellville all-day vs HSV after-work drive.",
    "Complete Paragould Sep 26 details (operator message cut off) — greene-community-forum already HOLD.",
    "Lock Sherwood rally venue/time/run-of-show with Jay Powell & Christy Low.",
    "Book Arkadelphia lodging; pull Bruce Bell church list into CRM notes.",
  ],
  planGuide: PLAN_REL,
  paragouldSep26: null,
};

try {
  actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  // Prefer staff-work; fall back to internal-meetings if seed naming differs.
  try {
    await calendarBySlug("staff-work");
  } catch {
    for (const spec of SPECS) {
      if (spec.calendarSlug === "staff-work") spec.calendarSlug = "internal-meetings";
    }
    console.warn("WARN: staff-work missing — using internal-meetings for work/leave blocks");
  }

  for (const spec of SPECS) {
    const event = await upsertEvent({
      ...spec,
      source: "sep-operator-batch-ingest",
    });
    proof.events.push({
      key: spec.key,
      eventNumber: event.eventNumber,
      status: event.status,
    });
  }

  // Tighten Madison lodging to clear for 8pm return.
  await patchNotes(
    "lodging-madison-airbnb-2026-09-02",
    [
      "SOURCE: Operator — lodge overnight locally (Airbnb) for Madison County meeting the following day.",
      "SUPPORT for madison-county-2026-09-03.",
      "ARRIVAL: After travel-madison-2026-09-02 (5:00–9:00 PM).",
      "DEPART: return-madison-rosebud-2026-09-03 (8:00–11:00 PM to Rose Bud).",
      "STATUS: HOLD — Airbnb property TBD; do not invent street address.",
    ].join("\n"),
  );
  const lodging = await findByIngestKey("lodging-madison-airbnb-2026-09-02");
  if (lodging) {
    await prisma.event.update({
      where: { id: lodging.id },
      data: {
        endsAt: chicagoLocalToDate("2026-09-03T20:00:00"),
        version: { increment: 1 },
      },
    });
    console.log("UPDATED endsAt: lodging-madison-airbnb-2026-09-02 → 20:00 Sep 3");
  }

  await patchNotes(
    "madison-county-2026-09-03",
    [
      "SOURCE: Google Calendar invite Jul 11, 2026 — title “Madison county”. Kelly Grappe organizer.",
      "DATE CONFIRMED: Thursday Sep 3, 2026. Clock time, venue, and event subtype NOT on invite → isAllDay until locked.",
      "LOCATION: Madison County (default city Huntsville — county seat). Venue TBD.",
      "ARRIVAL: travel-madison-2026-09-02 + lodging-madison-airbnb-2026-09-02.",
      "RETURN: return-madison-rosebud-2026-09-03 (8:00–11:00 PM to Rose Bud).",
      "CANDIDATE: Expected in-county presence; speaking role TBD until program known.",
    ].join("\n"),
  );

  // Sep 26 Paragould — operator message truncated; keep existing forum + flag.
  const greene = await patchNotes(
    "greene-community-forum-2026-09-26",
    [
      "Date confirmed (Paragould / Greene County). Program, venue, time, participants, and Kelly role TBD.",
      "Placeholder 10:00–12:00 CT until details land.",
      `[${PASS}] Operator began Sep 26 Paragould update but message truncated — awaiting remaining details. Keep HOLD.`,
    ].join("\n"),
  );
  if (greene) {
    proof.paragouldSep26 = {
      key: "greene-community-forum-2026-09-26",
      eventNumber: greene.eventNumber,
      status: greene.status,
      note: "Awaiting operator completion of truncated message",
    };
  }

  // Ensure plan guide exists (written by companion file in same pass).
  const planPath = path.join(root, PLAN_REL);
  if (!fs.existsSync(planPath)) {
    console.warn(`WARN: plan guide missing at ${PLAN_REL} — write before commit`);
  } else {
    console.log(`PLAN: ${PLAN_REL}`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "sep-operator-batch-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
  console.log(`EVENTS: ${proof.events.length}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
