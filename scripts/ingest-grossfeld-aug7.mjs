/**
 * Jim Grossfeld — Aug 7 LR meeting (time TBD)
 * Steve offered availability; Jim in LR all day. Phone in CRM only.
 *
 * Usage: npm run events:ingest:grossfeld-aug7
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "GROSSFELD-LR-2026-08-07";
const KEY = "meet-jim-grossfeld-lr-2026-08-07";
const TRAVEL_KEY = "travel-hope-2026-08-07";

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

const proof = {
  pass: PASS,
  meeting: null,
  travel: null,
  conflictsSurfaced: [
    "meet-jim-grossfeld-lr-2026-08-07 (LR, time TBD) ∩ travel-hope-2026-08-07 (depart ~2:00 PM HOLD)",
  ],
  openDecisions: [
    "Lock exact Aug 7 meeting time/place with Jim Grossfeld (he is in LR all day).",
    "Keep Hope travel afternoon, or delay Hope positioning if meeting runs late.",
  ],
  omittedFromGit: ["Contact phone numbers", "Contact emails"],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "candidate", archivedAt: null },
  });
  if (!calendar) throw new Error("candidate calendar missing");

  // Soft morning/midday HOLD — exact clock TBD with Jim; afternoon reserved for Hope travel.
  const meetingSpec = {
    key: KEY,
    internalTitle: "Meeting – Jim Grossfeld (Little Rock)",
    campaignDisplayTitle: "Meeting – Jim Grossfeld",
    eventType: "Stakeholder / Relationship Meeting",
    status: "HOLD",
    priority: "High",
    startsAt: chicagoLocalToDate("2026-08-07T09:00:00"),
    endsAt: chicagoLocalToDate("2026-08-07T12:00:00"),
    city: "Little Rock",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    candidateRole: "Primary",
    privateNotes: notes(
      KEY,
      [
        "SOURCE: Jim Grossfeld → Steve Grappe (Jul 12, 2026). Steve replied: availability that day; work around Jim's schedule.",
        "CONTEXT: Follow-up on exchange with Mary Bea Gross; Jim wants to speak with Kelly. Jim in Little Rock all day Aug 7.",
        "STATUS: HOLD — exact time/venue TBD (placeholder 9:00–12:00 CT until locked).",
        "SAME-DAY PRESSURE: travel-hope-2026-08-07 currently HOLD depart ~2:00 PM for Hope Watermelon Festival positioning (Aug 8).",
        "Do not invent Confirmed clock time until Jim locks a slot.",
        "Contact phone in operator CRM only — never commit.",
      ].join("\n"),
    ),
  };

  const existing = await findByIngestKey(KEY);
  const data = {
    internalTitle: meetingSpec.internalTitle,
    campaignDisplayTitle: meetingSpec.campaignDisplayTitle,
    eventType: meetingSpec.eventType,
    status: meetingSpec.status,
    priority: meetingSpec.priority,
    startsAt: meetingSpec.startsAt,
    endsAt: meetingSpec.endsAt,
    timezone: "America/Chicago",
    city: meetingSpec.city,
    state: "Arkansas",
    locationDisclosure: meetingSpec.locationDisclosure,
    defaultVisibility: meetingSpec.defaultVisibility,
    candidateAttendance: meetingSpec.candidateAttendance,
    candidateRole: meetingSpec.candidateRole,
    privateNotes: meetingSpec.privateNotes,
    primaryCalendarId: calendar.id,
  };

  let meeting;
  if (existing) {
    meeting = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    console.log(`UPDATED: ${KEY} → ${meeting.eventNumber}`);
  } else {
    meeting = await prisma.$transaction(async (tx) => {
      const eventNumber = await allocateEventNumber(tx, 2026);
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
      await tx.auditLog.create({
        data: {
          actorUserId: actorUser.id,
          actorType: "USER",
          action: "EVENT_CREATED",
          entityType: "Event",
          entityId: event.id,
          source: "grossfeld-aug7-ingest",
          reason: `Ingest ${PASS}`,
          newStateRedacted: {
            eventNumber: event.eventNumber,
            ingestKey: KEY,
            status: event.status,
          },
        },
      });
      return event;
    });
    console.log(`CREATED: ${KEY} → ${meeting.eventNumber}`);
  }

  proof.meeting = {
    key: KEY,
    eventNumber: meeting.eventNumber,
    status: meeting.status,
  };

  const travel = await findByIngestKey(TRAVEL_KEY);
  if (travel) {
    const updatedTravel = await prisma.event.update({
      where: { id: travel.id },
      data: {
        privateNotes: notes(
          TRAVEL_KEY,
          [
            "SUPPORT for hope-watermelon-festival-2026-08-08. Hotel TBD. Parent: Hope Watermelon Festival Campaign Swing.",
            "SAME-DAY: meet-jim-grossfeld-lr-2026-08-07 HOLD in Little Rock (time TBD; soft morning block). Steve offered to work around Jim's schedule.",
            "If Grossfeld meeting locks after ~1:00 PM, delay or compress Hope travel — do not auto-resolve.",
          ].join("\n"),
        ),
        version: { increment: 1 },
      },
    });
    proof.travel = {
      key: TRAVEL_KEY,
      eventNumber: updatedTravel.eventNumber,
      status: updatedTravel.status,
    };
    console.log(`UPDATED: ${TRAVEL_KEY} → ${updatedTravel.eventNumber}`);
  } else {
    console.warn(`WARN: missing ${TRAVEL_KEY} — meeting created without travel cross-note`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "grossfeld-aug7-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
