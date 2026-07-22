/**
 * Analyze live Event graph for duplicates (read-only).
 * Usage: node scripts/run-with-h-drive-env.cjs node scripts/analyze-calendar-duplicates.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

spawnSync(process.execPath, ["scripts/ensure-app-session-secret.mjs"], {
  cwd: root,
  stdio: "inherit",
});

const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  if (loaded[key] && !process.env[key]) process.env[key] = loaded[key];
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function ingestKey(notes) {
  const m = String(notes ?? "").match(/\[ingestKey:([^\]]+)\]/);
  return m?.[1] ?? null;
}

function chicagoDay(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function normTitle(t) {
  return String(t ?? "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

try {
  const events = await prisma.event.findMany({
    where: { archivedAt: null, status: { not: "CANCELLED" } },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      campaignDisplayTitle: true,
      eventType: true,
      status: true,
      startsAt: true,
      endsAt: true,
      city: true,
      privateNotes: true,
      sourceType: true,
      primaryCalendar: { select: { slug: true } },
      updatedAt: true,
      version: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const byIngest = new Map();
  const byDayTitle = new Map();
  const byWindowTitle = new Map();

  for (const e of events) {
    const key = ingestKey(e.privateNotes);
    if (key) {
      const list = byIngest.get(key) ?? [];
      list.push(e);
      byIngest.set(key, list);
    }

    const day = chicagoDay(e.startsAt);
    const title = normTitle(e.campaignDisplayTitle || e.internalTitle);
    const dayKey = `${day}|${title}|${e.primaryCalendar.slug}`;
    const dayList = byDayTitle.get(dayKey) ?? [];
    dayList.push(e);
    byDayTitle.set(dayKey, dayList);

    const winKey = `${e.startsAt.toISOString()}|${e.endsAt.toISOString()}|${title}`;
    const winList = byWindowTitle.get(winKey) ?? [];
    winList.push(e);
    byWindowTitle.set(winKey, winList);
  }

  const ingestDupes = [...byIngest.entries()].filter(([, v]) => v.length > 1);
  const dayDupes = [...byDayTitle.entries()].filter(([, v]) => v.length > 1);
  const winDupes = [...byWindowTitle.entries()].filter(([, v]) => v.length > 1);

  // Near-duplicates: same day + overlapping times + similar title tokens
  const near = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (chicagoDay(a.startsAt) !== chicagoDay(b.startsAt)) continue;
      if (!(a.startsAt < b.endsAt && b.startsAt < a.endsAt)) continue;
      const ta = normTitle(a.campaignDisplayTitle || a.internalTitle);
      const tb = normTitle(b.campaignDisplayTitle || b.internalTitle);
      if (ta === tb) continue; // already in dayDupes
      const shared =
        ta.length > 8 &&
        tb.length > 8 &&
        (ta.includes(tb.slice(0, 12)) ||
          tb.includes(ta.slice(0, 12)) ||
          (ta.split(" ").filter((w) => w.length > 4 && tb.includes(w)).length >= 2));
      if (!shared) continue;
      near.push({
        day: chicagoDay(a.startsAt),
        a: `${a.eventNumber} ${a.internalTitle}`,
        b: `${b.eventNumber} ${b.internalTitle}`,
      });
    }
  }

  const report = {
    activeCount: events.length,
    duplicateIngestKeys: ingestDupes.map(([k, v]) => ({
      key: k,
      count: v.length,
      events: v.map((e) => e.eventNumber),
    })),
    duplicateSameDayTitleCalendar: dayDupes.map(([k, v]) => ({
      key: k,
      count: v.length,
      events: v.map((e) => ({
        eventNumber: e.eventNumber,
        startsAt: e.startsAt.toISOString(),
        status: e.status,
        city: e.city,
      })),
    })),
    duplicateExactWindowTitle: winDupes.map(([k, v]) => ({
      key: k,
      count: v.length,
      events: v.map((e) => e.eventNumber),
    })),
    nearOverlapSimilarTitle: near.slice(0, 80),
    counts: {
      ingestKeyGroups: ingestDupes.length,
      dayTitleGroups: dayDupes.length,
      exactWindowGroups: winDupes.length,
      nearPairs: near.length,
    },
  };

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "calendar-dedupe-analysis-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(`active=${report.activeCount}`);
  console.log(`wrote ${path.relative(root, outPath)}`);
  if (dayDupes.length) {
    console.log("--- sample day/title dupes ---");
    for (const row of report.duplicateSameDayTitleCalendar.slice(0, 25)) {
      console.log(row.key, row.events.map((e) => e.eventNumber).join(", "));
    }
  }
  if (near.length) {
    console.log("--- sample near overlaps ---");
    for (const row of near.slice(0, 25)) {
      console.log(row.day, "|", row.a, "∩", row.b);
    }
  }
} finally {
  await prisma.$disconnect();
}
