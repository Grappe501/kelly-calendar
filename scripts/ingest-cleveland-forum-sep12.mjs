/**
 * Cleveland County forum – Jametta Harper (Sat Sep 12, 2026)
 * Source: Google Calendar invite (Kelly organizer). No clock time on invite → all-day HOLD clock until locked.
 * Guest emails stay in CRM only.
 *
 * Usage: npm run events:ingest:cleveland-forum-sep12
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "CLEVELAND-FORUM-2026-09-12";
const KEY = "cleveland-county-forum-jametta-harper-2026-09-12";
const RALLY_KEY = "river-valley-has-a-choice-rally-2026-09-13";

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
  forum: null,
  adjacentDay: null,
  openDecisions: [
    "Lock exact time and venue (Rison / Cleveland County) with Jametta Harper.",
    "Plan overnight / early travel for Sep 13 Fort Smith River Valley rally (1:00 PM arrival).",
  ],
  omittedFromGit: ["Guest email addresses", "Contact phones"],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "county-activity", archivedAt: null },
  });
  if (!calendar) throw new Error("county-activity calendar missing");

  const startsAt = chicagoLocalToDate("2026-09-12T00:00:00");
  const endsAt = chicagoLocalToDate("2026-09-12T23:59:00");

  const privateNotes = notes(
    KEY,
    [
      "SOURCE: Google Calendar invite Jul 11, 2026 — title “Cleveland county forum - Jametta Harper”. Kelly Grappe organizer.",
      "DATE CONFIRMED: Saturday Sep 12, 2026. Clock time and venue NOT on invite → isAllDay until locked.",
      "LOCAL CONTACT/HOST: Jametta Harper (Cleveland County Democrats). Contact details in CRM only.",
      "LOCATION: Cleveland County (default city Rison — county seat). Venue TBD — do not invent address.",
      "CANDIDATE: Expected speaking / forum participation (role TBD until run-of-show).",
      "NEXT-DAY LOGISTICS: river-valley-has-a-choice-rally-2026-09-13 Fort Smith (speaker arrival 1:00 PM). Long cross-state jump — overnight plan TBD; do not auto-resolve travel.",
      "Guest emails (Kelly / Steve Google accounts) in CRM/calendar only — never commit.",
    ].join("\n"),
  );

  const data = {
    internalTitle: "Cleveland County Forum – Jametta Harper",
    campaignDisplayTitle: "Cleveland County Forum",
    eventType: "County Candidate Forum / Community Meeting",
    status: "CONFIRMED",
    priority: "High",
    startsAt,
    endsAt,
    timezone: "America/Chicago",
    isAllDay: true,
    city: "Rison",
    state: "Arkansas",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    candidateRole: "SPEAKING",
    privateNotes,
    primaryCalendarId: calendar.id,
  };

  const existing = await findByIngestKey(KEY);
  let forum;
  if (existing) {
    forum = await prisma.event.update({
      where: { id: existing.id },
      data: { ...data, version: { increment: 1 } },
    });
    console.log(`UPDATED: ${KEY} → ${forum.eventNumber}`);
  } else {
    forum = await prisma.$transaction(async (tx) => {
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
          source: "cleveland-forum-sep12-ingest",
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
    console.log(`CREATED: ${KEY} → ${forum.eventNumber}`);
  }

  proof.forum = {
    key: KEY,
    eventNumber: forum.eventNumber,
    status: forum.status,
    isAllDay: true,
  };

  const rally = await findByIngestKey(RALLY_KEY);
  if (rally) {
    const prior = rally.privateNotes ?? "";
    const marker = "[adjacent:cleveland-forum-2026-09-12]";
    if (!prior.includes(marker)) {
      const updated = await prisma.event.update({
        where: { id: rally.id },
        data: {
          privateNotes: `${prior}\n${marker}\nADJACENT DAY: Cleveland County forum (Rison) Sat Sep 12 — plan overnight / early transit for 1:00 PM Fort Smith arrival.`,
          version: { increment: 1 },
        },
      });
      proof.adjacentDay = {
        key: RALLY_KEY,
        eventNumber: updated.eventNumber,
        note: "cross-noted",
      };
      console.log(`UPDATED: ${RALLY_KEY} → ${updated.eventNumber} (adjacent-day note)`);
    } else {
      proof.adjacentDay = {
        key: RALLY_KEY,
        eventNumber: rally.eventNumber,
        note: "already cross-noted",
      };
    }
  } else {
    console.warn(`WARN: missing ${RALLY_KEY} — forum created without adjacent-day note`);
  }

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "cleveland-forum-sep12-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
