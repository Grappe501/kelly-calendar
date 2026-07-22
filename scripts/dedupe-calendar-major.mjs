/**
 * Major calendar dedupe — cancel known multi-pass duplicates + exact clones.
 * Keeps the richer / later operator truth; never deletes rows.
 *
 * Usage: npm run events:dedupe:major
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASS = "DEDUPE-MAJOR-2026-07-21";

const isDeployRuntime =
  process.env.NETLIFY === "true" || process.env.CONTEXT === "production";
if (isDeployRuntime && process.env.KCCC_ALLOW_OPERATOR_LIVE_INGEST !== "true") {
  console.error(
    "REFUSED: dedupe blocked on Netlify/production without KCCC_ALLOW_OPERATOR_LIVE_INGEST=true",
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

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function ingestKey(notes) {
  return String(notes ?? "").match(/\[ingestKey:([^\]]+)\]/)?.[1] ?? null;
}

function normTitle(t) {
  return String(t ?? "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim();
}

/** Explicit alias groups: keep first ingestKey that exists; cancel the rest. */
const ALIAS_GROUPS = [
  {
    id: "river-valley-rally-2026-09-13",
    keepPreferred: [
      "river-valley-has-a-choice-rally-2026-09-13",
      "river-valley-choice-rally-2026-09-13",
    ],
  },
  {
    id: "travel-eldorado-2026-08-04",
    keepPreferred: [
      "travel-eldorado-position-2026-08-04",
      "travel-eldorado-2026-08-04",
    ],
  },
  {
    id: "lodging-hsv-2026-07-22",
    keepPreferred: [
      "lodging-hsv-host-2026-07-22",
      "lodging-hsv-deb-bryan-2026-07-22",
    ],
  },
  {
    id: "hsv-dems-speaking-2026-07-23",
    keepPreferred: [
      "hsv-dems-road-to-blue-2026-07-23",
      "hsv-democrats-kelly-2026-07-23",
    ],
  },
];

/** Cancel these ingest keys / event numbers unconditionally (seed junk). */
const CANCEL_ALWAYS = {
  ingestKeys: [],
  eventNumbers: ["KCCC-2026-0001", "KCCC-2026-0002"],
  titleIncludes: ["KCCC Step 5.7 Synthetic Mutation Proof"],
};

const proof = {
  pass: PASS,
  cancelled: [],
  kept: [],
  skipped: [],
  activeBefore: 0,
  activeAfter: 0,
};

async function cancelEvent(event, reason) {
  if (event.status === "CANCELLED") {
    proof.skipped.push({ eventNumber: event.eventNumber, reason: "already-cancelled" });
    return;
  }
  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "CANCELLED",
      privateNotes: `${event.privateNotes ?? ""}\n[DEDUPE:${PASS}] ${reason}`,
      version: { increment: 1 },
    },
  });
  proof.cancelled.push({
    eventNumber: event.eventNumber,
    ingestKey: ingestKey(event.privateNotes),
    title: event.internalTitle,
    reason,
  });
  console.log(`CANCEL ${event.eventNumber} — ${reason}`);
}

function scoreKeeper(e) {
  let score = 0;
  if (e.status === "CONFIRMED") score += 50;
  if (e.status === "HOLD") score += 20;
  if (e.status === "TENTATIVE") score += 10;
  score += Math.min(String(e.privateNotes ?? "").length, 400) / 10;
  score += e.version ?? 0;
  // Prefer higher event numbers when otherwise close (later ingest)
  const n = Number(String(e.eventNumber).split("-").pop());
  if (!Number.isNaN(n)) score += n / 1000;
  return score;
}

try {
  proof.activeBefore = await prisma.event.count({
    where: { archivedAt: null, status: { not: "CANCELLED" } },
  });

  const events = await prisma.event.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      campaignDisplayTitle: true,
      status: true,
      startsAt: true,
      endsAt: true,
      privateNotes: true,
      version: true,
      primaryCalendar: { select: { slug: true } },
    },
  });

  const byIngest = new Map();
  for (const e of events) {
    const key = ingestKey(e.privateNotes);
    if (!key) continue;
    const list = byIngest.get(key) ?? [];
    list.push(e);
    byIngest.set(key, list);
  }

  // 1) Explicit alias groups
  for (const group of ALIAS_GROUPS) {
    const members = [];
    for (const key of group.keepPreferred) {
      for (const e of byIngest.get(key) ?? []) {
        if (e.status !== "CANCELLED") members.push({ key, e });
      }
    }
    if (members.length <= 1) {
      if (members[0]) {
        proof.kept.push({
          group: group.id,
          eventNumber: members[0].e.eventNumber,
          ingestKey: members[0].key,
        });
      }
      continue;
    }
    // Prefer first listed preferred key that exists; else highest score
    let keeper = null;
    for (const preferred of group.keepPreferred) {
      const hit = members.find((m) => m.key === preferred);
      if (hit) {
        keeper = hit;
        break;
      }
    }
    if (!keeper) {
      keeper = members.sort((a, b) => scoreKeeper(b.e) - scoreKeeper(a.e))[0];
    }
    proof.kept.push({
      group: group.id,
      eventNumber: keeper.e.eventNumber,
      ingestKey: keeper.key,
    });
    for (const m of members) {
      if (m.e.id === keeper.e.id) continue;
      await cancelEvent(
        m.e,
        `Alias of ${keeper.e.eventNumber} (${group.id}); kept ingestKey=${keeper.key}`,
      );
    }
  }

  // 2) Always-cancel synthetic / seed junk
  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    const title = e.internalTitle || e.campaignDisplayTitle || "";
    const byNumber = CANCEL_ALWAYS.eventNumbers.includes(e.eventNumber);
    const byTitle = CANCEL_ALWAYS.titleIncludes.some((t) => title.includes(t));
    if (byNumber || byTitle) {
      await cancelEvent(e, "Synthetic/seed junk — remove from live calendar");
    }
  }

  // Reload active set for clone detection
  const active = await prisma.event.findMany({
    where: { archivedAt: null, status: { not: "CANCELLED" } },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      campaignDisplayTitle: true,
      status: true,
      startsAt: true,
      endsAt: true,
      privateNotes: true,
      version: true,
      primaryCalendar: { select: { slug: true } },
    },
  });

  // 3) Exact same window + normalized title
  const byWindow = new Map();
  for (const e of active) {
    const title = normTitle(e.campaignDisplayTitle || e.internalTitle);
    const key = `${e.startsAt.toISOString()}|${e.endsAt.toISOString()}|${title}`;
    const list = byWindow.get(key) ?? [];
    list.push(e);
    byWindow.set(key, list);
  }
  for (const [key, list] of byWindow) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => scoreKeeper(b) - scoreKeeper(a));
    const keeper = sorted[0];
    proof.kept.push({
      group: `exact-window:${key}`,
      eventNumber: keeper.eventNumber,
      ingestKey: ingestKey(keeper.privateNotes),
    });
    for (const dup of sorted.slice(1)) {
      await cancelEvent(
        dup,
        `Exact window/title clone of ${keeper.eventNumber}`,
      );
    }
  }

  // 4) Same Chicago day + same calendar slug + same normalized title (different clocks)
  const chicagoDay = (d) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);

  const stillActive = await prisma.event.findMany({
    where: { archivedAt: null, status: { not: "CANCELLED" } },
    select: {
      id: true,
      eventNumber: true,
      internalTitle: true,
      campaignDisplayTitle: true,
      status: true,
      startsAt: true,
      endsAt: true,
      privateNotes: true,
      version: true,
      primaryCalendar: { select: { slug: true } },
    },
  });

  const byDayTitleCal = new Map();
  for (const e of stillActive) {
    const title = normTitle(e.campaignDisplayTitle || e.internalTitle);
    // Skip generic titles that can legitimately repeat
    if (title.length < 12) continue;
    if (/^travel home/.test(title)) continue;
    const key = `${chicagoDay(e.startsAt)}|${e.primaryCalendar.slug}|${title}`;
    const list = byDayTitleCal.get(key) ?? [];
    list.push(e);
    byDayTitleCal.set(key, list);
  }
  for (const [key, list] of byDayTitleCal) {
    if (list.length < 2) continue;
    // Only auto-merge if times overlap
    const overlapping = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
          overlapping.push(a, b);
        }
      }
    }
    const uniq = [...new Map(overlapping.map((e) => [e.id, e])).values()];
    if (uniq.length < 2) continue;
    const sorted = uniq.sort((a, b) => scoreKeeper(b) - scoreKeeper(a));
    const keeper = sorted[0];
    proof.kept.push({
      group: `day-title-overlap:${key}`,
      eventNumber: keeper.eventNumber,
      ingestKey: ingestKey(keeper.privateNotes),
    });
    for (const dup of sorted.slice(1)) {
      await cancelEvent(
        dup,
        `Same-day overlapping title clone of ${keeper.eventNumber}`,
      );
    }
  }

  proof.activeAfter = await prisma.event.count({
    where: { archivedAt: null, status: { not: "CANCELLED" } },
  });

  const outDir = path.join(root, "develop_notes", "database_proofs");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "calendar-dedupe-major-latest.json");
  fs.writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    `PASS: cancelled=${proof.cancelled.length} active ${proof.activeBefore}→${proof.activeAfter}`,
  );
  console.log(`PASS: wrote ${path.relative(root, outPath)}`);
} catch (err) {
  console.error("FAIL:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
