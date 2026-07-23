import type { RawStrategicRecord } from "@/features/reddirt-integration/types";
import { filterAllowedFields } from "@/features/reddirt-integration/privacy-allowlist";

const MAX_BYTES = 1_000_000;
const MAX_ROWS = 500;

export type ExportParseResult = {
  records: RawStrategicRecord[];
  rowCount: number;
  excludedSensitiveRows: number;
  unknownColumns: string[];
  sourceHash: string;
  errors: string[];
};

function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return `export-${(h >>> 0).toString(16)}`;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

/** Operator-initiated approved JSON/CSV export parse — same privacy pipeline as network. */
export function parseRedDirtExport(
  buffer: Buffer | string,
  filename: string,
): ExportParseResult {
  const text = typeof buffer === "string" ? buffer : buffer.toString("utf8");
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) {
    return {
      records: [],
      rowCount: 0,
      excludedSensitiveRows: 0,
      unknownColumns: [],
      sourceHash: hashText(text),
      errors: ["File exceeds size bound."],
    };
  }
  const lower = filename.toLowerCase();
  let rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const unknownColumns = new Set<string>();

  try {
    if (lower.endsWith(".json")) {
      const parsed = JSON.parse(text) as
        | { records?: Record<string, unknown>[] }
        | Record<string, unknown>[];
      rows = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.records)
          ? parsed.records
          : [];
    } else if (lower.endsWith(".csv")) {
      rows = parseCsv(text);
    } else {
      errors.push("Only .json or .csv exports are supported.");
    }
  } catch {
    errors.push("Unable to parse export file.");
  }

  if (rows.length > MAX_ROWS) {
    errors.push(`Row count exceeds bound (${MAX_ROWS}).`);
    rows = rows.slice(0, MAX_ROWS);
  }

  const records: RawStrategicRecord[] = [];
  let excludedSensitiveRows = 0;
  for (const row of rows) {
    const filtered = filterAllowedFields(row);
    for (const col of filtered.excludedFields) unknownColumns.add(col);
    if (
      filtered.privacyClassification === "PERSONAL_CONTACT" ||
      filtered.privacyClassification === "SENSITIVE_PERSONAL"
    ) {
      excludedSensitiveRows += 1;
      continue;
    }
    const id = String(
      filtered.allowed.externalObjectId ?? row.externalObjectId ?? "",
    ).trim();
    if (!id) {
      errors.push("Row missing externalObjectId.");
      continue;
    }
    records.push({
      ...(filtered.allowed as RawStrategicRecord),
      externalObjectId: id,
    });
  }

  return {
    records,
    rowCount: rows.length,
    excludedSensitiveRows,
    unknownColumns: [...unknownColumns],
    sourceHash: hashText(text),
    errors,
  };
}
