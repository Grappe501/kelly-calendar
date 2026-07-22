/**
 * Arkansas Goat Festival — Perryville (Sat Oct 3, 2026, 10:00–16:00)
 * Public info: arkansasgoatfestival.com
 *
 * Usage: npm run events:ingest:goat-festival-oct3
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "GOAT-FESTIVAL-2026-10-03";
const KEY = "goat-festival-perryville-2026-10-03";

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
  event: null,
  openDecisions: [
    "Confirm Kelly attendance / booth vs walk-through.",
    "Confirm exact venue address inside Perryville if needed for travel.",
  ],
};

try {
  const actorUser = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!actorUser) throw new Error("Kelly synthetic user missing — run auth seed");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "field", archivedAt: null },
  });
  if (!calendar) throw new Error("field calendar missing");

  const startsAt = chicagoLocalToDate("2026-10-03T10:00:00");
  const endsAt = chicagoLocalToDate("2026-10-03T16:00:00");

  const privateNotes = notes(
    KEY,
    [
      "SOURCE: Operator brief — Arkansas Goat Festival, Perryville.",
      "PUBLIC HOURS: Saturday Oct 3, 2026, 10:00 AM–4:00 PM America/Chicago.",
      "COUNTY: Perry County. City: Perryville.",
      "INFO: arkansasgoatfestival.com",
      "TYPE: Community festival / regional outreach. Success = conversations, relationships, signups — not speaking time unless invited.",
      "Adjacent: Baxter Farm Bureau forum Oct 6 (Mountain Home) — separate mission; travel plan TBD if both attended.",
    ].join("\n"),
  );

  const data = {
    internalTitle: "Arkansas Goat Festival – Perryville",
    campaignDisplayTitle: "Arkansas Goat Festival – Perryville",
    eventType: "Community Festival / Regional Outreach",
    status: "CONFIRMED",
    priority: "High",
    startsAt,
    endsAt,
    timezone: "America/Chicago",
    isAllDay: false,
    city: "Perryville",
    state: "Arkansas",
    locationDisclosure: "CITY",
    defaultVisibility: "TITLE_LOCATION",
    candidateAttendance: true,
    privateNotes,
    primaryCalendarId: calendar.id,
  };

  const existing = await findByIngestKey(KEY);
  let event;
  if (existing) {
    event = await prisma.event.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: existing.status === "CANCELLED" ? "CONFIRMED" : data.status,
        version: { increment: 1 },
      },
    });
    console.log(`UPDATED: ${KEY} → ${event.eventNumber}`);
  } else {
    event = await prisma.$transaction(async (tx) => {
      const eventNumber = await allocateEventNumber(tx, 2026);
      const created = await tx.event.create({
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
          eventId: created.id,
          calendarId: calendar.id,
          membershipType: "PRIMARY",
          isPrimary: true,
          createdByUserId: actorUser.id,
        },
      });
      await tx.eventStatusHistory.create({
        data: {
          eventId: created.id,
          fromStatus: null,
          toStatus: created.status,
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
          entityId: created.id,
          source: "goat-festival-oct3-ingest",
          reason: `Ingest ${PASS}`,
          newStateRedacted: {
            eventNumber: created.eventNumber,
            ingestKey: KEY,
            status: created.status,
          },
        },
      });
      return created;
    });
    console.log(`CREATED: ${KEY} → ${event.eventNumber}`);
  }

  proof.event = {
    key: KEY,
    eventNumber: event.eventNumber,
    status: event.status,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "goat-festival-oct3-ingest-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
