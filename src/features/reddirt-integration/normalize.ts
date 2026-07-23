import { createHash } from "node:crypto";
import { filterAllowedFields } from "@/features/reddirt-integration/privacy-allowlist";
import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";
import type {
  NormalizedStrategicRecord,
  RawStrategicRecord,
} from "@/features/reddirt-integration/types";

export function fingerprintAllowedFields(
  allowed: Record<string, unknown>,
): string {
  const stable = JSON.stringify(
    Object.keys(allowed)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = allowed[key];
        return acc;
      }, {}),
  );
  return createHash("sha256").update(stable).digest("hex");
}

export function normalizeStrategicRecord(
  raw: RawStrategicRecord,
): NormalizedStrategicRecord {
  const filtered = filterAllowedFields(raw as Record<string, unknown>);
  const allowed = filtered.allowed;
  const externalObjectId = String(
    allowed.externalObjectId ?? raw.externalObjectId ?? "",
  ).trim();
  const objectType = String(
    allowed.objectType ?? raw.objectType ?? "STRATEGIC_FACT",
  ).trim();
  const countyFips = allowed.countyFips
    ? String(allowed.countyFips).trim()
    : null;
  const placeGeoid = allowed.placeGeoid
    ? String(allowed.placeGeoid).trim()
    : null;
  const factKind = String(allowed.factKind ?? "COUNTY_PRIORITY").trim();
  const factValue = String(allowed.factValue ?? "").trim();
  const factUnits = allowed.factUnits ? String(allowed.factUnits) : null;
  const fingerprint = fingerprintAllowedFields({
    externalObjectId,
    objectType,
    countyFips,
    placeGeoid,
    factKind,
    factValue,
    factUnits,
    focusArea: allowed.focusArea ?? null,
  });

  return {
    externalObjectId,
    objectType,
    countyFips,
    placeGeoid,
    countyName: allowed.countyName ? String(allowed.countyName) : null,
    placeName: allowed.placeName ? String(allowed.placeName) : null,
    factKind,
    factValue,
    factUnits,
    focusArea: allowed.focusArea ? String(allowed.focusArea) : null,
    remoteUpdatedAt: allowed.updatedAt ? String(allowed.updatedAt) : null,
    allowedFields: allowed,
    fingerprint,
    privacyClassification: filtered.privacyClassification,
    excludedFieldCount: filtered.excludedFieldCount,
    excludedFields: filtered.excludedFields,
    mappingVersion: REDDIRT_DOCS.mappingVersion,
    privacyAllowlistVersion: filtered.privacyAllowlistVersion,
  };
}
