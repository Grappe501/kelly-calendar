/**
 * Geography reconciliation — match order:
 * authoritative id → exact+context → alias → operator.
 * Never title-only (raw title without county/place context is UNMATCHED).
 */

import { normalizeCountyName, normalizePlaceName } from "./normalize";
import type {
  GeographyAuthorityIndex,
  GeographyMatchMethod,
  GeographyMatchOutcome,
  GeographyReconcileInput,
  GeographyReconcileResult,
} from "./types";

function result(
  matchMethod: GeographyMatchMethod,
  outcome: GeographyMatchOutcome,
  countyId: string | null,
  placeAuthorityId: string | null,
  evidence: Record<string, unknown>,
): GeographyReconcileResult {
  return { matchMethod, outcome, countyId, placeAuthorityId, evidence };
}

export function reconcileGeography(
  input: GeographyReconcileInput,
  index: GeographyAuthorityIndex,
): GeographyReconcileResult {
  if (input.operatorConfirmed) {
    return result(
      "OPERATOR_CONFIRMED",
      input.operatorCountyId || input.operatorPlaceAuthorityId ? "MAPPED" : "UNMATCHED",
      input.operatorCountyId ?? null,
      input.operatorPlaceAuthorityId ?? null,
      { operatorConfirmed: true },
    );
  }

  const authId = (input.authoritativeId ?? "").trim();
  if (authId) {
    if (/^\d{5}$/.test(authId)) {
      const county = index.countiesByFips.get(authId);
      if (county) {
        return result("AUTHORITATIVE_ID", "EXACT", county.id, null, {
          fipsCode: authId,
        });
      }
    }
    if (/^\d{7}$/.test(authId)) {
      const place = index.placesByGeoid.get(authId);
      if (place) {
        const county =
          place.primaryCountyFips != null
            ? index.countiesByFips.get(place.primaryCountyFips)
            : undefined;
        return result(
          "AUTHORITATIVE_ID",
          "EXACT",
          county?.id ?? null,
          place.id,
          { censusPlaceGeoid: authId },
        );
      }
    }
  }

  const raw = (input.rawText ?? "").trim();
  const countyContextRaw = (input.countyContext ?? "").trim();

  // Never title-only: require raw text AND county context (or authoritative already handled).
  if (!raw || !countyContextRaw) {
    return result("UNMATCHED", "UNMATCHED", null, null, {
      reason: "TITLE_ONLY_OR_MISSING_CONTEXT",
      hasRaw: Boolean(raw),
      hasCountyContext: Boolean(countyContextRaw),
    });
  }

  const placeNorm = normalizePlaceName(raw);
  const countyNorm = normalizeCountyName(countyContextRaw);
  const countyFromContext =
    index.countiesByFips.get(countyContextRaw) ??
    index.countiesByNormalized.get(countyNorm)?.[0] ??
    null;

  const placeCandidates = index.placesByNormalized.get(placeNorm) ?? [];
  if (placeCandidates.length === 1 && countyFromContext) {
    const place = placeCandidates[0]!;
    const placeCountyOk =
      !place.primaryCountyFips ||
      place.primaryCountyFips === countyFromContext.fipsCode;
    if (placeCountyOk) {
      return result("EXACT_NORMALIZED", "EXACT", countyFromContext.id, place.id, {
        placeNorm,
        countyNorm,
      });
    }
  }
  if (placeCandidates.length > 1) {
    const filtered = countyFromContext
      ? placeCandidates.filter(
          (p) =>
            !p.primaryCountyFips ||
            p.primaryCountyFips === countyFromContext.fipsCode,
        )
      : placeCandidates;
    if (filtered.length === 1 && countyFromContext) {
      return result("EXACT_NORMALIZED", "EXACT", countyFromContext.id, filtered[0]!.id, {
        placeNorm,
        countyNorm,
        disambiguated: true,
      });
    }
    if (filtered.length > 1) {
      return result("EXACT_NORMALIZED", "AMBIGUOUS", countyFromContext?.id ?? null, null, {
        placeNorm,
        candidateIds: filtered.map((p) => p.id),
      });
    }
  }

  // County-only exact (when raw text is the county name itself).
  if (countyFromContext && placeNorm === countyNorm) {
    return result("EXACT_NORMALIZED", "EXACT", countyFromContext.id, null, {
      countyNorm,
      mode: "COUNTY_NAME",
    });
  }

  const aliasHits = index.aliasesByNormalized.get(placeNorm) ?? [];
  if (aliasHits.length === 1) {
    const hit = aliasHits[0]!;
    return result(
      "ALIAS",
      "MAPPED",
      hit.countyId ?? countyFromContext?.id ?? null,
      hit.placeAuthorityId ?? null,
      { placeNorm, alias: true },
    );
  }
  if (aliasHits.length > 1) {
    return result("ALIAS", "AMBIGUOUS", countyFromContext?.id ?? null, null, {
      placeNorm,
      aliasCount: aliasHits.length,
    });
  }

  if (countyFromContext && !placeCandidates.length) {
    return result("CONTEXT_COUNTY", "MAPPED", countyFromContext.id, null, {
      countyNorm,
      placeUnmatched: true,
    });
  }

  return result("UNMATCHED", "UNMATCHED", null, null, {
    placeNorm,
    countyNorm,
  });
}
