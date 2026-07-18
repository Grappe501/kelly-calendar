import "server-only";

import fs from "node:fs";
import path from "node:path";
import type {
  GoogleCalendarImportManifest,
  StagedCalendarEvent,
} from "@/features/calendar-import/import-types";
import { formatStamp } from "@/features/calendar-import/normalize-google-event";
import { assertManifestSafe } from "@/features/calendar-import/import-manifest";

const STAGING_ROOT = path.join(process.cwd(), "data", "ingest_staging");

function ensureDirs(): void {
  for (const rel of ["raw", "normalized", "review", "rejected", "reports", "drafts"]) {
    const dir = path.join(STAGING_ROOT, rel);
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getStagingRoot(): string {
  ensureDirs();
  return STAGING_ROOT;
}

function writeJsonl(filePath: string, rows: unknown[]): void {
  const body = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  fs.writeFileSync(filePath, body, "utf8");
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export type StageImportResult = {
  importId: string;
  stamp: string;
  manifestPath: string;
  reviewPath: string;
  normalizedPath: string;
  reportPath: string;
  rawPath?: string;
  manifest: GoogleCalendarImportManifest;
};

export function stageGoogleImport(options: {
  manifest: GoogleCalendarImportManifest;
  rawIcs?: string;
  events: StagedCalendarEvent[];
  rejected: StagedCalendarEvent[];
}): StageImportResult {
  ensureDirs();
  assertManifestSafe(options.manifest);
  const stamp = formatStamp();
  const importId = options.manifest.importId;

  let rawPath: string | undefined;
  if (options.rawIcs) {
    rawPath = path.join(STAGING_ROOT, "raw", `google-calendar-${stamp}.ics`);
    fs.writeFileSync(rawPath, options.rawIcs, "utf8");
  }

  const normalizedPath = path.join(
    STAGING_ROOT,
    "normalized",
    `google-calendar-events-${importId}.jsonl`,
  );
  const reviewPath = path.join(
    STAGING_ROOT,
    "review",
    `google-calendar-review-queue-${importId}.jsonl`,
  );
  const rejectedPath = path.join(
    STAGING_ROOT,
    "rejected",
    `google-calendar-rejected-${importId}.jsonl`,
  );
  const reportPath = path.join(
    STAGING_ROOT,
    "reports",
    `google-calendar-import-report-${importId}.json`,
  );
  const manifestPath = path.join(STAGING_ROOT, "latest_import_manifest.json");

  writeJsonl(normalizedPath, options.events);
  writeJsonl(
    reviewPath,
    options.events.filter((e) => e.review.status === "UNREVIEWED" || e.deduplication.status !== "NEW"),
  );
  writeJsonl(rejectedPath, options.rejected);

  const completed: GoogleCalendarImportManifest = {
    ...options.manifest,
    completedAt: new Date().toISOString(),
    status: "STAGED",
    databaseWriteAttempted: false,
    migrationAttempted: false,
    operatorReviewRequired: true,
  };
  assertManifestSafe(completed);

  fs.writeFileSync(manifestPath, JSON.stringify(completed, null, 2), "utf8");
  fs.writeFileSync(
    path.join(STAGING_ROOT, "reports", `manifest-${importId}.json`),
    JSON.stringify(completed, null, 2),
    "utf8",
  );

  const report = {
    importId,
    stagedAt: completed.completedAt,
    counts: completed.counts,
    databaseWriteAttempted: false,
    stagingRoot: "data/ingest_staging",
    files: {
      normalized: path.basename(normalizedPath),
      review: path.basename(reviewPath),
      rejected: path.basename(rejectedPath),
      raw: rawPath ? path.basename(rawPath) : null,
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  // Source registry — fingerprints only
  const registryPath = path.join(STAGING_ROOT, "source_registry.json");
  const registry = fs.existsSync(registryPath)
    ? JSON.parse(fs.readFileSync(registryPath, "utf8"))
    : { sources: [] as Array<Record<string, string>> };
  registry.sources = registry.sources.filter(
    (s: { fingerprint?: string }) => s.fingerprint !== completed.sourceFingerprint,
  );
  registry.sources.push({
    fingerprint: completed.sourceFingerprint,
    label: completed.sourceLabel,
    sourceType: completed.sourceType,
    lastImportId: importId,
    updatedAt: completed.completedAt!,
  });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");

  return {
    importId,
    stamp,
    manifestPath,
    reviewPath,
    normalizedPath,
    reportPath,
    rawPath,
    manifest: completed,
  };
}

export function listImportManifests(): GoogleCalendarImportManifest[] {
  ensureDirs();
  const reportsDir = path.join(STAGING_ROOT, "reports");
  return fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith("manifest-") && f.endsWith(".json"))
    .map((f) =>
      JSON.parse(fs.readFileSync(path.join(reportsDir, f), "utf8")) as GoogleCalendarImportManifest,
    )
    .sort((a, b) => (b.fetchedAt || "").localeCompare(a.fetchedAt || ""));
}

export function getImportManifest(importId: string): GoogleCalendarImportManifest | null {
  const file = path.join(STAGING_ROOT, "reports", `manifest-${importId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as GoogleCalendarImportManifest;
}

export function getLatestManifest(): GoogleCalendarImportManifest | null {
  const file = path.join(STAGING_ROOT, "latest_import_manifest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as GoogleCalendarImportManifest;
}

export function getReviewQueue(importId?: string): StagedCalendarEvent[] {
  ensureDirs();
  const reviewDir = path.join(STAGING_ROOT, "review");
  const files = fs
    .readdirSync(reviewDir)
    .filter((f) => f.endsWith(".jsonl"))
    .filter((f) => (importId ? f.includes(importId) : true));
  return files.flatMap((f) => readJsonl<StagedCalendarEvent>(path.join(reviewDir, f)));
}

export function getNormalizedEvents(importId: string): StagedCalendarEvent[] {
  const file = path.join(
    STAGING_ROOT,
    "normalized",
    `google-calendar-events-${importId}.jsonl`,
  );
  return readJsonl<StagedCalendarEvent>(file);
}

export function getImportStatusSummary() {
  ensureDirs();
  const latest = getLatestManifest();
  const runs = listImportManifests();
  return {
    ok: true,
    stagingRoot: "data/ingest_staging",
    historicalFloor: "2025-11-01",
    databaseWritesEnabled: false,
    liveSyncEnabled: false,
    runCount: runs.length,
    latestImportId: latest?.importId ?? null,
    latestStatus: latest?.status ?? null,
    latestCounts: latest?.counts ?? null,
    authenticationComplete: false,
  };
}
