import { createHash } from "node:crypto";
import type { IntegrityFindingType } from "@/lib/calendar/integrity/types";

export function stableIntegrityFindingKey(
  findingType: IntegrityFindingType,
  parts: Array<string | null | undefined>,
): string {
  const basis = [findingType, ...parts.map((p) => (p ?? "").trim())]
    .join("|")
    .toLowerCase();
  return `${findingType}:${createHash("sha256").update(basis).digest("hex").slice(0, 20)}`;
}

export function normalizeEventTitle(title: string | null | undefined): string {
  return String(title ?? "")
    .toLowerCase()
    .replace(/[""''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function chicagoDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function extractIngestKey(notes: string | null | undefined): string | null {
  const m = String(notes ?? "").match(/\[ingestKey:([^\]]+)\]/);
  return m?.[1]?.trim() || null;
}

export function extractImportFingerprint(
  notes: string | null | undefined,
): string | null {
  const m = String(notes ?? "").match(/\[importFingerprint:([^\]]+)\]/);
  return m?.[1]?.trim() || null;
}

export function extractSourceEventIdFromNotes(
  notes: string | null | undefined,
): string | null {
  const m = String(notes ?? "").match(/\[sourceEventId:([^\]]+)\]/);
  return m?.[1]?.trim() || null;
}

export function timesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function redactLocationForEvidence(
  city: string | null | undefined,
  streetAddress: string | null | undefined,
): { city: string | null; streetRedacted: boolean } {
  return {
    city: city?.trim() || null,
    streetRedacted: Boolean(streetAddress?.trim()),
  };
}
