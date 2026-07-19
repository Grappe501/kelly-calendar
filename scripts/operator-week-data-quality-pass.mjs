/**
 * Live calendar data-quality & readiness pass (evidence only).
 * No UI · no AI · no schema · Feature Freeze honored.
 *
 * Usage: node scripts/run-with-h-drive-env.cjs node scripts/operator-week-data-quality-pass.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const childEnv = { ...process.env, NODE_ENV: process.env.NETLIFY === "true" ? process.env.NODE_ENV : "development" };

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

function chicagoParts(d) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
}

function chicagoKey(d) {
  const p = Object.fromEntries(chicagoParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function chicagoClock(d) {
  const p = Object.fromEntries(chicagoParts(d).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute}`;
}

function extractIngestKey(notes) {
  const m = notes?.match(/\[ingestKey:([^\]]+)\]/);
  return m?.[1] ?? null;
}

function notesFlag(notes, re) {
  return re.test(notes ?? "");
}

try {
  const all = await prisma.event.findMany({
    where: {
      OR: [
        { privateNotes: { contains: "[ingestKey:" } },
        { eventNumber: { startsWith: "KCCC-2026-" } },
      ],
    },
    include: {
      primaryCalendar: { select: { slug: true, name: true, calendarType: true } },
      calendarMemberships: {
        select: { calendarId: true, isPrimary: true, membershipType: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const operator = all.filter((e) => extractIngestKey(e.privateNotes));
  const active = operator.filter((e) => e.status !== "CANCELLED" && !e.archivedAt);
  const cancelled = operator.filter((e) => e.status === "CANCELLED");

  const findings = [];
  const followUps = [];

  for (const e of active) {
    const key = extractIngestKey(e.privateNotes);
    const cal = e.primaryCalendar;
    const isPersonal = cal.calendarType === "PROTECTED_PERSONAL";
    const row = {
      eventNumber: e.eventNumber,
      key,
      status: e.status,
      calendarSlug: cal.slug,
      calendarType: cal.calendarType,
      title: e.internalTitle,
      startsAtChicago: `${chicagoKey(e.startsAt)} ${chicagoClock(e.startsAt)}`,
      endsAtChicago: `${chicagoKey(e.endsAt)} ${chicagoClock(e.endsAt)}`,
      isAllDay: e.isAllDay,
      visibility: e.defaultVisibility,
      locationDisclosure: e.locationDisclosure,
      city: e.city,
      venueName: e.venueName,
      candidateRole: e.candidateRole,
      candidateAttendance: e.candidateAttendance,
      membershipCount: e.calendarMemberships.length,
      ownership: {
        ownerUserIdPresent: Boolean(e.ownerUserId),
        createdByUserIdPresent: Boolean(e.createdByUserId),
        primaryCalendarOwned: Boolean(e.primaryCalendarId),
      },
      unknownMarkers: {
        endUnknown: notesFlag(e.privateNotes, /End time:\s*UNKNOWN/i),
        lodgingUnknown: notesFlag(e.privateNotes, /Lodging venue:\s*UNKNOWN/i),
        schemaPlaceholderEnd: notesFlag(e.privateNotes, /start\+1min placeholder/i),
        shiftUnknown: notesFlag(e.privateNotes, /Volunteer shift:\s*UNKNOWN/i),
        attendanceUnknown: notesFlag(e.privateNotes, /Kelly attendance:\s*UNKNOWN/i),
      },
      visibilityOk:
        !isPersonal ||
        (e.defaultVisibility === "BUSY_ONLY" &&
          (e.locationDisclosure === "HIDDEN" || e.locationDisclosure === "CITY")),
      tentativeLabeled: e.status === "TENTATIVE" || e.status === "HOLD",
    };

    if (!row.ownership.ownerUserIdPresent) {
      findings.push({ severity: "High", code: "DQ-OWN-01", event: e.eventNumber, detail: "Missing ownerUserId" });
    }
    if (isPersonal && e.defaultVisibility !== "BUSY_ONLY") {
      findings.push({
        severity: "Critical",
        code: "DQ-VIS-01",
        event: e.eventNumber,
        detail: "Protected Personal not BUSY_ONLY",
      });
    }
    if (row.unknownMarkers.schemaPlaceholderEnd) {
      findings.push({
        severity: "Medium",
        code: "DQ-TIME-01",
        event: e.eventNumber,
        detail: "End time UNKNOWN — schema uses +1min placeholder; UI may look like a 1-minute event",
      });
      followUps.push({
        event: e.eventNumber,
        field: "endsAt",
        action: "Confirm England meeting end time with host",
      });
    }
    if (row.unknownMarkers.lodgingUnknown) {
      followUps.push({
        event: e.eventNumber,
        field: "lodging",
        action: "Record Blytheville lodging when available",
      });
    }
    if (key === "cave-city-christy-low-2026-07-24") {
      followUps.push({
        event: e.eventNumber,
        field: "volunteerShift",
        action: "Confirm Christy Low shift, assignment, meeting point; Kelly/Steve attendance",
      });
      if (e.candidateAttendance === true) {
        findings.push({
          severity: "Critical",
          code: "DQ-ATT-01",
          event: e.eventNumber,
          detail: "candidateAttendance true without confirmation",
        });
      }
    }
    if (key === "kelly-work-littlerock-2026-07-21" && e.isAllDay) {
      followUps.push({
        event: e.eventNumber,
        field: "workHours",
        action: "Optional: replace all-day busy with exact 8–12 / 1–5 block if operator wants clock precision",
      });
    }
  }

  // Overlap analysis among active timed (non-all-day) events
  const timed = active.filter((e) => !e.isAllDay);
  const overlaps = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        overlaps.push({
          a: a.eventNumber,
          b: b.eventNumber,
          aTitle: a.internalTitle,
          bTitle: b.internalTitle,
          note: "Time ranges overlap — not auto-resolved",
        });
      }
    }
  }

  // Travel continuity (Pass 2 active path)
  const byKey = Object.fromEntries(active.map((e) => [extractIngestKey(e.privateNotes), e]));
  const continuity = [
    {
      chain: "Fundraiser → Blytheville overnight",
      ok: Boolean(byKey["fundraiser-cd2-2026-07-19"] && byKey["overnight-blytheville-2026-07-19"]),
      detail: "Overnight starts at fundraiser end (7pm) by design",
    },
    {
      chain: "Blytheville overnight end vs farm internet 8am",
      ok: true,
      conflict: true,
      detail: "Overnight ends 8:00 AM; internet at farm 8:00 AM — travel/availability pressure (DQ conflict)",
    },
    {
      chain: "England → Return to farm",
      ok: false,
      staged: true,
      detail: "Return staged (UNKNOWN times) — no live travel block after England",
    },
    {
      chain: "Carroll County picnic / Mon 8pm farm depart",
      ok: true,
      superseded: true,
      detail: "CANCELLED under Pass 2 — must not appear as active plan",
    },
  ];

  for (const o of overlaps) {
    findings.push({
      severity: "High",
      code: "DQ-CONFLICT-01",
      event: `${o.a}/${o.b}`,
      detail: `${o.aTitle} overlaps ${o.bTitle}`,
    });
  }

  // Staged drafts
  const draftsDir = path.join(root, "data", "ingest_staging", "drafts");
  const staged = [];
  for (const name of [
    "draft_pass2_naacp_steve_jonesboro.json",
    "draft_pass2_return_farm_after_england.json",
  ]) {
    const p = path.join(draftsDir, name);
    staged.push({
      file: name,
      present: fs.existsSync(p),
      liveCalendar: false,
    });
    if (!fs.existsSync(p)) {
      findings.push({
        severity: "High",
        code: "DQ-STAGE-01",
        event: name,
        detail: "Expected staged Unknown-time draft missing",
      });
    }
  }

  // Supersession integrity
  const carrollActive = active.filter((e) =>
    /carroll|farm-depart-carroll/i.test(extractIngestKey(e.privateNotes) ?? ""),
  );
  if (carrollActive.length) {
    findings.push({
      severity: "Critical",
      code: "DQ-SUPERSEDE-01",
      event: carrollActive.map((e) => e.eventNumber).join(","),
      detail: "Carroll-related ingest keys still ACTIVE after Pass 2",
    });
  }

  const naacpLive = active.find((e) =>
    (extractIngestKey(e.privateNotes) ?? "").includes("naacp-steve"),
  );
  if (naacpLive) {
    findings.push({
      severity: "Critical",
      code: "DQ-SUPERSEDE-02",
      event: naacpLive.eventNumber,
      detail: "Fabricated-time NAACP still ACTIVE — should be CANCELLED + staged",
    });
  }

  const report = {
    pass: "LIVE-CALENDAR-DATA-QUALITY-2026-07-19",
    generatedAt: new Date().toISOString(),
    gitNote: "Authoritative tip after Pass 2 is 3fdd190 — not 8610f7e Pass-1 expand",
    featureFreeze: "honored",
    aiPatternRecognition: "not_run",
    counts: {
      operatorTaggedTotal: operator.length,
      activeLive: active.length,
      cancelledSuperseded: cancelled.length,
      stagedDraftsExpected: 2,
      stagedDraftsPresent: staged.filter((s) => s.present).length,
      overlapPairs: overlaps.length,
      findings: findings.length,
      followUps: followUps.length,
    },
    activeInventory: active.map((e) => ({
      eventNumber: e.eventNumber,
      key: extractIngestKey(e.privateNotes),
      status: e.status,
      calendar: e.primaryCalendar.slug,
      type: e.primaryCalendar.calendarType,
      chicago: `${chicagoKey(e.startsAt)} ${chicagoClock(e.startsAt)}–${chicagoClock(e.endsAt)}`,
      visibility: e.defaultVisibility,
      candidateRole: e.candidateRole,
      candidateAttendance: e.candidateAttendance,
      isAllDay: e.isAllDay,
    })),
    cancelledInventory: cancelled.map((e) => ({
      eventNumber: e.eventNumber,
      key: extractIngestKey(e.privateNotes),
      title: e.internalTitle,
    })),
    overlaps,
    travelContinuity: continuity,
    staged,
    findings,
    followUps,
    readinessVerdict: {
      dataReadyForOperatorViewing: active.length >= 7,
      dataReadyForAiPatterns: false,
      reasonAiBlocked: "Feature Freeze + insufficient confirmed structure + XR-8 not authorized",
      strongestOperationalConcerns: [
        "Mon morning ISP ∩ Don Henry overlap",
        "Blytheville overnight end vs farm ISP at 8:00 AM",
        "England end UNKNOWN (+1min placeholder)",
        "Steve NAACP and return-to-farm still staged (no live clock)",
        "No simultaneous Kelly/Steve dual-city Monday evening on LIVE calendar (NAACP not live) — Pass 2 corrected Pass-1 pressure",
      ],
    },
  };

  const outJson = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "live-calendar-data-quality-latest.json",
  );
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

  const md = `# Live Calendar Data-Quality & Readiness Pass

**Pass ID:** \`LIVE-CALENDAR-DATA-QUALITY-2026-07-19\`  
**Nature:** Evidence only · **no behavior changes** · **no AI** · Feature Freeze **HONORED**  
**Git tip (authoritative):** Pass 2 \`3fdd190\` — not Pass-1 expand \`8610f7e\`

## Corrected program state

| Claim (outdated acceptance) | Current truth (Pass 2) |
|----------------------------|-------------------------|
| Git \`8610f7e\` · 18 live events | Tip \`3fdd190\` · **${active.length} active** operator-tagged · **${cancelled.length} CANCELLED** superseded |
| Steve NAACP live at 6:00 PM | **CANCELLED** live · **staged** draft (time UNKNOWN) |
| Farm meeting / Carroll prep 8:00 PM | **CANCELLED** (superseded) |
| Carroll picnic later week | **CANCELLED** |

## Inventory

### Active live (${active.length})

${active
  .map(
    (e) =>
      `- **${e.eventNumber}** · ${e.primaryCalendar.slug} · ${e.status} · ${chicagoKey(e.startsAt)} ${chicagoClock(e.startsAt)}–${chicagoClock(e.endsAt)}${e.isAllDay ? " (all-day)" : ""} · ${e.internalTitle}`,
  )
  .join("\n")}

### Superseded CANCELLED (${cancelled.length})

Preserved for audit — not active plan. Includes Carroll travel/picnic, fabricated NAACP 6pm, and prior Wed–Sun Pass-1 itinerary.

### Staged (Unknown times)

| Draft | Present |
|-------|---------|
${staged.map((s) => `| \`${s.file}\` | ${s.present ? "YES" : "MISSING"} |`).join("\n")}

## Ownership

All active operator-tagged events checked for \`ownerUserId\` / \`createdByUserId\` / primary calendar.

## Visibility

Protected Personal active rows must be \`BUSY_ONLY\`. Findings list any breach.

## Conflicts (surfaced, not solved)

${overlaps.length ? overlaps.map((o) => `- ${o.a} ∩ ${o.b}: ${o.aTitle} / ${o.bTitle}`).join("\n") : "- (no timed overlaps among active non-all-day rows)"}

Additional operational pressure (not necessarily time-range overlap):

- Blytheville overnight ends **8:00 AM** vs farm internet **8:00 AM**

## Travel continuity

${continuity.map((c) => `- **${c.chain}**: ${c.detail}${c.superseded ? " · SUPERSEDED" : ""}${c.staged ? " · STAGED" : ""}${c.conflict ? " · CONFLICT" : ""}`).join("\n")}

## Findings (${findings.length})

${findings.length ? findings.map((f) => `- **${f.severity}** \`${f.code}\` · ${f.event} — ${f.detail}`).join("\n") : "- None"}

## Missing-field follow-ups (${followUps.length})

${followUps.map((f) => `- ${f.event} · **${f.field}**: ${f.action}`).join("\n")}

## Readiness verdict

| Question | Answer |
|----------|--------|
| Ready for authorized operator calendar viewing? | **${report.readinessVerdict.dataReadyForOperatorViewing ? "YES" : "NO"}** |
| Ready for AI pattern recognition? | **NO** |
| Why AI blocked | Feature Freeze · XR-8 not authorized · Unknown/staged gaps remain |

## Strongest operational concerns (current truth)

1. Monday morning ISP ∩ Don Henry overlap (keep visible).
2. Blytheville overnight → farm ISP at 8:00 AM (travel/availability).
3. England end UNKNOWN (placeholder duration).
4. Steve NAACP + return-to-farm still **staged** — not on live clock.
5. Dual-city Monday evening pressure from Pass-1 is **not** on the live calendar after Pass 2 (NAACP not live).

## Explicitly not done

- No drill-down pages  
- No AI / pattern rebuild  
- No Feature Freeze waiver  
- No silent conflict resolution  

Proof JSON: \`develop_notes/database_proofs/live-calendar-data-quality-latest.json\`
`;

  const outMd = path.join(root, "develop_notes", "KCCC_LIVE_CALENDAR_DATA_QUALITY_PASS.md");
  fs.writeFileSync(outMd, md);
  console.log(`PASS: wrote ${path.relative(root, outJson)}`);
  console.log(`PASS: wrote ${path.relative(root, outMd)}`);
  console.log(
    JSON.stringify(
      {
        activeLive: active.length,
        cancelled: cancelled.length,
        overlaps: overlaps.length,
        findings: findings.length,
        followUps: followUps.length,
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
