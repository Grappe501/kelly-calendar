import {
  reconcileGeography,
  type GeographyAuthorityIndex,
  type GeographyReconcileResult,
} from "@/lib/geography";
import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";
import type { NormalizedStrategicRecord } from "@/features/reddirt-integration/types";

export type RedDirtGeographyReconcileResult = GeographyReconcileResult & {
  geographyReconcileVersion: string;
  proposedLocalObjectType: "ArkansasCounty" | "GeographyPlaceAuthority" | null;
  proposedLocalObjectId: string | null;
  action:
    | "NEW_REMOTE"
    | "MATCHED_UNCHANGED"
    | "AMBIGUOUS_MATCH"
    | "CONFLICT"
    | "UNSUPPORTED"
    | "IGNORED";
};

/**
 * IC-01 owns FIPS/GEOID. Prefer authoritativeId (5-digit FIPS / 7-digit GEOID).
 * Never auto-match on bare name when ambiguous.
 */
export function reconcileRedDirtGeography(
  record: NormalizedStrategicRecord,
  index: GeographyAuthorityIndex,
  existingFingerprints?: Map<string, string>,
): RedDirtGeographyReconcileResult {
  const authoritativeId = record.countyFips ?? record.placeGeoid ?? null;
  const base = reconcileGeography(
    {
      authoritativeId,
      rawText: record.placeName ?? record.countyName ?? null,
      countyContext: record.countyName ?? record.countyFips ?? null,
    },
    index,
  );

  let proposedLocalObjectType:
    | "ArkansasCounty"
    | "GeographyPlaceAuthority"
    | null = null;
  let proposedLocalObjectId: string | null = null;

  if (base.countyId && !base.placeAuthorityId) {
    proposedLocalObjectType = "ArkansasCounty";
    proposedLocalObjectId = base.countyId;
  } else if (base.placeAuthorityId) {
    proposedLocalObjectType = "GeographyPlaceAuthority";
    proposedLocalObjectId = base.placeAuthorityId;
  }

  let action: RedDirtGeographyReconcileResult["action"] = "NEW_REMOTE";
  if (base.outcome === "AMBIGUOUS") {
    action = "AMBIGUOUS_MATCH";
  } else if (base.outcome === "UNMATCHED" || base.outcome === "SUPERSEDED") {
    action = "UNSUPPORTED";
  } else if (
    existingFingerprints?.get(record.externalObjectId) === record.fingerprint
  ) {
    action = "MATCHED_UNCHANGED";
  } else if (
    record.privacyClassification === "PERSONAL_CONTACT" ||
    record.privacyClassification === "SENSITIVE_PERSONAL"
  ) {
    action = "IGNORED";
  }

  return {
    ...base,
    geographyReconcileVersion: REDDIRT_DOCS.geographyReconcileVersion,
    proposedLocalObjectType,
    proposedLocalObjectId,
    action,
  };
}
