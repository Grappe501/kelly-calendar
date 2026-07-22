/**
 * Benton County Immersion Week — Aug 17–20, 2026
 * Daytime immersion + evening JP-district community gatherings (hosts/venues TBD).
 * Does not invent JP names or district numbers until operator locks them.
 *
 * Usage: npm run events:ingest:benton-immersion-week
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "BENTON-IMMERSION-WEEK-2026-08-17";
const UMBRELLA_KEY = "nwa-immersion-tour-2026-08-17";

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

const DAYS = [
  {
    ymd: "2026-08-17",
    weekday: "Mon",
    city: "Bentonville",
    dayFocus: "Travel in · leaders / business / courthouse start",
  },
  {
    ymd: "2026-08-18",
    weekday: "Tue",
    city: "Rogers",
    dayFocus: "Daytime immersion · churches / volunteers / intel",
  },
  {
    ymd: "2026-08-19",
    weekday: "Wed",
    city: "Bella Vista",
    dayFocus: "Daytime immersion · relationship density",
  },
  {
    ymd: "2026-08-20",
    weekday: "Thu",
    city: "Bentonville",
    dayFocus: "Close immersion · Benton County summary draft · return Rose Bud",
  },
];

const proof = {
  pass: PASS,
  created: [],
  updated: [],
  openDecisions: [
    "Lock JP host + district number for each evening gathering (Benton County has 15 JP districts — do not invent).",
    "Lock evening venues and whether Kelly speaks or hosts listening format.",
    "Accept/decline Shela Norman Bella Vista lodging for this week.",
  ],
};

async function upsert(actorUser, calendarBySlug, spec) {
  const calendar = calendarBySlug[spec.calendarSlug];
  if (!calendar) throw new Error(`Calendar missing: ${spec.calendarSlug}`);

  const data = {
    internalTitle: spec.internalTitle,
    campaignDisplayTitle: spec.campaignDisplayTitle,
    eventType: spec.eventType,
    status: spec.status,
    priority: spec.priority ?? "High",
    startsAt: spec.startsAt,
    endsAt: spec.endsAt,
    timezone: "America/Chicago",
    isAllDay: Boolean(spec.isAllDay),
    isMultiDay: Boolean(spec.isMultiDay),
    city: spec.city ?? null,
    state: "Arkansas",
    locationDisclosure: spec.locationDisclosure ?? "CITY",
    defaultVisibility: spec.defaultVisibility ?? "TITLE_LOCATION",
    candidateAttendance:
      spec.candidateAttendance === undefined ? true : spec.candidateAttendance,
    candidateRole: spec.candidateRole ?? null,
    privateNotes: spec.privateNotes,
    primaryCalendarId: calendar.id,
  };

  const existing = await findByIngestKey(spec.key);
  if (existing) {
    const updated = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: existing.status === "CANCELLED" ? data.status : data.status,
        version: { increment: 1 },
      },
    });
    proof.updated.push({ key: spec.key, eventNumber: updated.eventNumber });
    console.log(`UPDATED: ${spec.key} → ${updated.eventNumber}`);
    return updated;
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
        reason: `Ingest ${PASS}`,
      },
    });
    return event;
  });
  proof.created.push({ key: spec.key, eventNumber: created.eventNumber });
  console.log(`CREATED: ${spec.key} → ${created.eventNumber}`);
  return created;
}

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing");

  const slugs = ["county-activity", "travel", "field"];
  const calendars = await prisma.calendar.findMany({
    where: { slug: { in: slugs }, archivedAt: null },
  });
  const calendarBySlug = Object.fromEntries(calendars.map((c) => [c.slug, c]));

  // Keep umbrella as CANCELLED — day + JP evenings are the visible schedule.
  // Re-assert cancel so re-runs do not revive the multi-day blanket.
  {
    const umbrella = await findByIngestKey(UMBRELLA_KEY);
    if (umbrella && umbrella.status !== "CANCELLED") {
      await prisma.event.update({
        where: { id: umbrella.id },
        data: {
          status: "CANCELLED",
          privateNotes: `${umbrella.privateNotes ?? ""}\n[CANCELLED:${PASS}] Multi-day umbrella not listed — use daytime immersion + JP district evenings.`,
          version: { increment: 1 },
        },
      });
      console.log(`CANCELLED umbrella: ${UMBRELLA_KEY} → ${umbrella.eventNumber}`);
    }
  }

  const specs = [
    {
      key: "travel-benton-2026-08-17",
      calendarSlug: "travel",
      internalTitle: "Travel to Benton County (immersion week)",
      campaignDisplayTitle: "Travel to Benton County",
      eventType: "Travel / Mission Positioning",
      status: "HOLD",
      startsAt: chicagoLocalToDate("2026-08-17T08:00:00"),
      endsAt: chicagoLocalToDate("2026-08-17T12:00:00"),
      city: "Bentonville",
      privateNotes: notes(
        "travel-benton-2026-08-17",
        "SUPPORT for Benton County Immersion Week. Arrive midday for Mon immersion block.",
      ),
    },
    {
      key: "travel-rosebud-after-benton-2026-08-20",
      calendarSlug: "travel",
      internalTitle: "Travel Benton County → Rose Bud (home)",
      campaignDisplayTitle: "Travel home – Rose Bud",
      eventType: "Travel / Return Home",
      status: "HOLD",
      priority: "Normal",
      startsAt: chicagoLocalToDate("2026-08-20T18:00:00"),
      endsAt: chicagoLocalToDate("2026-08-20T22:00:00"),
      city: "Rose Bud",
      privateNotes: notes(
        "travel-rosebud-after-benton-2026-08-20",
        "After Thu immersion close / JP evening. Parent: Benton County Immersion Week.",
      ),
    },
  ];

  for (const day of DAYS) {
    specs.push({
      key: `benton-immersion-day-${day.ymd}`,
      calendarSlug: "county-activity",
      internalTitle: `Benton County Immersion – ${day.weekday} daytime`,
      campaignDisplayTitle: `Benton Immersion – ${day.weekday}`,
      eventType: "County Immersion / Daytime Field",
      status: "HOLD",
      startsAt: chicagoLocalToDate(`${day.ymd}T12:00:00`),
      endsAt: chicagoLocalToDate(`${day.ymd}T17:00:00`),
      city: day.city,
      candidateAttendance: true,
      privateNotes: notes(
        `benton-immersion-day-${day.ymd}`,
        [
          `Parent week: ${UMBRELLA_KEY}.`,
          `FOCUS: ${day.dayFocus}.`,
          "Targets: leaders · business · courthouse · churches · volunteers · intelligence · follow-up.",
          "Capture contacts for Relationship Command Center; nightly intel report required.",
        ].join("\n"),
      ),
    });

    // Evening JP-district gatherings Mon–Wed (Thu is return night — soft evening only if host locks).
    if (day.ymd !== "2026-08-20") {
      specs.push({
        key: `benton-jp-district-evening-${day.ymd}`,
        calendarSlug: "field",
        internalTitle: `JP District Community Gathering – Benton County (${day.weekday})`,
        campaignDisplayTitle: `JP District Gathering – ${day.weekday}`,
        eventType: "JP District / Community Gathering",
        status: "HOLD",
        startsAt: chicagoLocalToDate(`${day.ymd}T18:30:00`),
        endsAt: chicagoLocalToDate(`${day.ymd}T20:30:00`),
        city: day.city,
        candidateAttendance: true,
        candidateRole: "SPEAKING",
        privateNotes: notes(
          `benton-jp-district-evening-${day.ymd}`,
          [
            `Parent week: ${UMBRELLA_KEY}.`,
            "Evening gathering WITH Justice of the Peace in their district (host + district # TBD — operator lock).",
            "Benton County has 15 JP districts; do not invent host names or district numbers.",
            "Format TBD: listening / remarks / recruit. Venue TBD.",
            "SUCCESS: relationships, volunteer prospects, intel — not crowd size alone.",
          ].join("\n"),
        ),
      });
    }
  }

  // Optional Thu soft JP if operator wants — skip return conflict; leave openDecision only.

  for (const spec of specs) {
    await upsert(actorUser, calendarBySlug, spec);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "benton-immersion-week-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    `PASS: created=${proof.created.length} updated=${proof.updated.length}`,
  );
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
