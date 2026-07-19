/**
 * Pass 3 data-quality checks (Aug/Sep ingest + HSV restore).
 * Evidence only · Feature Freeze honored · no schema/UI/AI.
 *
 * Usage: node scripts/run-with-h-drive-env.cjs node scripts/operator-pass3-data-quality-pass.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function extractIngestKey(notes) {
  const m = notes?.match(/\[ingestKey:([^\]]+)\]/);
  return m?.[1] ?? null;
}

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

const REQUIRED_PASS3 = [
  "travel-hsv-2026-07-22",
  "lodging-hsv-deb-bryan-2026-07-22",
  "kelly-work-hsv-remote-2026-07-23",
  "hsv-democrats-kelly-2026-07-23",
  "fundraiser-bramlett-2026-08-02",
  "faulkner-dem-fundraiser-2026-08-02",
  "kelly-erin-2026-08-04",
  "travel-eldorado-2026-08-04",
  "wf-eldorado-immersion-2026-08-05",
  "retired-ministers-eldorado-2026-08-05",
  "travel-russellville-2026-08-05",
  "travel-hope-2026-08-07",
  "black-caucus-gbm-2026-08-08",
  "river-valley-choice-rally-2026-09-13",
];

try {
  const all = await prisma.event.findMany({
    where: { privateNotes: { contains: "[ingestKey:" } },
    include: {
      primaryCalendar: { select: { slug: true, calendarType: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const byKey = Object.fromEntries(
    all.map((e) => [extractIngestKey(e.privateNotes), e]).filter(([k]) => k),
  );
  const findings = [];
  const checks = [];

  for (const key of REQUIRED_PASS3) {
    const e = byKey[key];
    const ok = Boolean(e) && e.status !== "CANCELLED" && !e.archivedAt;
    checks.push({ id: `present:${key}`, ok, detail: e ? `${e.eventNumber} ${e.status}` : "MISSING" });
    if (!ok) findings.push({ severity: "Critical", code: "P3-MISS", detail: `Missing active ${key}` });
  }

  const bramlett = byKey["fundraiser-bramlett-2026-08-02"];
  const faulkner = byKey["faulkner-dem-fundraiser-2026-08-02"];
  const aug2Conflict =
    bramlett &&
    faulkner &&
    bramlett.status === "CONFIRMED" &&
    faulkner.status === "HOLD" &&
    bramlett.startsAt < faulkner.endsAt &&
    faulkner.startsAt < bramlett.endsAt;
  checks.push({
    id: "aug2-conflict-visible",
    ok: Boolean(aug2Conflict),
    detail: "Bramlett CONFIRMED ∩ Faulkner HOLD 5–7pm",
  });
  if (!aug2Conflict) {
    findings.push({ severity: "Critical", code: "P3-CONFLICT", detail: "Aug 2 conflict not correctly represented" });
  }
  if (faulkner?.candidateAttendance === true) {
    findings.push({
      severity: "Critical",
      code: "P3-FAULKNER-ATT",
      detail: "Faulkner must not have confirmed attendance",
    });
  }

  const caucus = byKey["black-caucus-gbm-2026-08-08"];
  checks.push({
    id: "black-caucus-informational-hold",
    ok: caucus?.status === "HOLD" && caucus.candidateAttendance !== true,
    detail: `${caucus?.status} attendance=${caucus?.candidateAttendance}`,
  });
  if (caucus?.status !== "HOLD" || caucus.candidateAttendance === true) {
    findings.push({
      severity: "Critical",
      code: "P3-CAUCUS",
      detail: "Black Caucus must remain HOLD / not attending",
    });
  }

  const hsvLive = [
    "travel-hsv-2026-07-22",
    "lodging-hsv-deb-bryan-2026-07-22",
    "kelly-work-hsv-remote-2026-07-23",
    "hsv-democrats-kelly-2026-07-23",
  ].every((k) => byKey[k] && byKey[k].status !== "CANCELLED");
  const hsvOldCancelled = [
    "depart-hsv-after-work-2026-07-22",
    "lodging-hsv-wed-2026-07-22",
    "kelly-work-hsv-2026-07-23",
  ].every((k) => !byKey[k] || byKey[k].status === "CANCELLED");
  checks.push({ id: "hsv-restored", ok: hsvLive && hsvOldCancelled, detail: "Pass-3 HSV live; Pass-1 CANCELLED" });
  if (!(hsvLive && hsvOldCancelled)) {
    findings.push({ severity: "Critical", code: "P3-HSV", detail: "HSV restore integrity failed" });
  }

  const work = byKey["kelly-work-hsv-remote-2026-07-23"];
  checks.push({
    id: "hsv-work-busy-only",
    ok: work?.defaultVisibility === "BUSY_ONLY",
    detail: work?.defaultVisibility,
  });
  if (work?.defaultVisibility !== "BUSY_ONLY") {
    findings.push({ severity: "Critical", code: "P3-VIS", detail: "HSV remote work must be BUSY_ONLY" });
  }

  const russellville = byKey["travel-russellville-2026-08-05"];
  const hope = byKey["travel-hope-2026-08-07"];
  checks.push({
    id: "travel-times-tentative",
    ok: russellville?.status === "TENTATIVE" && hope?.status === "TENTATIVE",
    detail: `russellville=${russellville?.status} hope=${hope?.status}`,
  });

  const rally = byKey["river-valley-choice-rally-2026-09-13"];
  checks.push({
    id: "river-valley-speaker",
    ok: rally?.candidateRole === "SPEAKING" && rally?.status === "CONFIRMED",
    detail: `${rally?.candidateRole} ${rally?.status}`,
  });
  checks.push({
    id: "river-valley-estimate-not-actual",
    ok: rally?.expectedAttendance == null,
    detail: `expectedAttendance=${rally?.expectedAttendance}`,
  });
  if (rally && chicagoClock(rally.startsAt) !== "13:00") {
    findings.push({ severity: "High", code: "P3-RALLY-TIME", detail: "Rally start should be 13:00 Chicago" });
  }

  const immersion = byKey["wf-eldorado-immersion-2026-08-05"];
  if (immersion?.isAllDay) {
    findings.push({
      severity: "Critical",
      code: "P3-WF-ALLDAY",
      detail: "WF Immersion must remain one-hour, not all-day",
    });
  }
  checks.push({
    id: "wf-immersion-one-hour",
    ok: immersion && !immersion.isAllDay && chicagoClock(immersion.startsAt) === "07:00",
    detail: immersion
      ? `${chicagoKey(immersion.startsAt)} ${chicagoClock(immersion.startsAt)}–${chicagoClock(immersion.endsAt)}`
      : "missing",
  });

  for (const e of all) {
    if (e.status === "CANCELLED") continue;
    const notes = e.privateNotes ?? "";
    const publicBlob = `${e.campaignDisplayTitle ?? ""}\n${e.campaignDescription ?? ""}\n${e.virtualMeetingUrl ?? ""}`;
    if (/\bPIN:\s*\d/i.test(publicBlob) || /\+1\s*\d{3}/.test(publicBlob)) {
      findings.push({
        severity: "Critical",
        code: "P3-PIN-LEAK",
        detail: `${e.eventNumber} exposes dial/PIN in public fields`,
      });
    }
    if (/\[RESTRICTED_MEET:/.test(notes) && e.virtualMeetingUrl) {
      findings.push({
        severity: "High",
        code: "P3-MEET-URL",
        detail: `${e.eventNumber} has virtualMeetingUrl despite restricted meet notes`,
      });
    }
  }

  const stagedPath = path.join(
    root,
    "data",
    "ingest_staging",
    "drafts",
    "draft_pass3_gcal_unresolved_2026-08-08.json",
  );
  let stagedOk = false;
  if (fs.existsSync(stagedPath)) {
    const draft = JSON.parse(fs.readFileSync(stagedPath, "utf8"));
    stagedOk =
      draft.liveCalendar === false &&
      draft.timing?.startsAtLocal === "UNKNOWN" &&
      Boolean(draft.pass3Meta?.googleCalendarTemplateUrl) &&
      !/watermelon/i.test(JSON.stringify(draft.basic ?? {}));
  }
  checks.push({ id: "opaque-gcal-staged-only", ok: stagedOk, detail: stagedPath });
  if (!stagedOk) {
    findings.push({
      severity: "Critical",
      code: "P3-GCAL",
      detail: "Unresolved GCal must stay staged without invented title/time",
    });
  }

  const pressRef = path.join(
    root,
    "develop_notes",
    "source_references",
    "river-valley-has-a-choice-press-release.md",
  );
  checks.push({ id: "press-release-indexed", ok: fs.existsSync(pressRef), detail: pressRef });

  const duplicates = [];
  const keyCounts = new Map();
  for (const e of all) {
    const k = extractIngestKey(e.privateNotes);
    if (!k) continue;
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
  }
  for (const [k, n] of keyCounts) {
    if (n > 1) duplicates.push({ key: k, count: n });
  }
  checks.push({ id: "no-duplicate-ingest-keys", ok: duplicates.length === 0, detail: duplicates });
  if (duplicates.length) {
    findings.push({ severity: "Critical", code: "P3-DUP", detail: JSON.stringify(duplicates) });
  }

  const verdict = findings.some((f) => f.severity === "Critical")
    ? "FAIL"
    : findings.length
      ? "PASS_WITH_FINDINGS"
      : "PASS";

  const report = {
    pass: "PASS3-DATA-QUALITY-2026-07-19",
    generatedAt: new Date().toISOString(),
    featureFreeze: "honored",
    aiBehaviorAdded: "NONE",
    drillDownPagesAdded: "NONE",
    verdict,
    checks,
    findings,
    inventory: REQUIRED_PASS3.map((key) => {
      const e = byKey[key];
      if (!e) return { key, missing: true };
      return {
        key,
        eventNumber: e.eventNumber,
        status: e.status,
        calendar: e.primaryCalendar.slug,
        chicago: `${chicagoKey(e.startsAt)} ${chicagoClock(e.startsAt)}–${chicagoClock(e.endsAt)}`,
        visibility: e.defaultVisibility,
        candidateRole: e.candidateRole,
        candidateAttendance: e.candidateAttendance,
      };
    }),
  };

  const outJson = path.join(
    root,
    "develop_notes",
    "database_proofs",
    "operator-pass3-data-quality-latest.json",
  );
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));

  const md = `# Pass 3 Data-Quality

**Verdict:** \`${verdict}\`  
**Feature Freeze:** HONORED · AI NONE · Drill-down NONE

## Checks

${checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.id} — ${typeof c.detail === "string" ? c.detail : JSON.stringify(c.detail)}`).join("\n")}

## Findings

${findings.length ? findings.map((f) => `- **${f.severity}** \`${f.code}\`: ${f.detail}`).join("\n") : "_None_"}
`;
  fs.writeFileSync(path.join(root, "develop_notes", "KCCC_OPERATOR_PASS3_DATA_QUALITY.md"), md);

  console.log(JSON.stringify({ verdict, findings: findings.length, checks: checks.length }, null, 2));
  if (verdict === "FAIL") process.exit(2);
} catch (err) {
  console.error("FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
