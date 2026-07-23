import "server-only";

import { createHash } from "node:crypto";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  normalizeCountyName,
  normalizePlaceName,
} from "@/lib/geography/normalize";
import { reconcileGeography } from "@/lib/geography/reconcile";
import type {
  GeographyAuthorityIndex,
  GeographyReconcileInput,
  GeographyReconcileResult,
} from "@/lib/geography/types";
import { TOP250_PLACES_DEFINITION } from "@/lib/geography/top250-definition";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { prisma } from "@/server/db/prisma";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Geography foundation requires campaign leadership access.",
    );
  }
}

function fingerprintEvidence(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload ?? {}))
    .digest("hex")
    .slice(0, 32);
}

async function buildAuthorityIndex(): Promise<GeographyAuthorityIndex> {
  const [counties, places, aliases] = await Promise.all([
    prisma.arkansasCounty.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fipsCode: true,
        name: true,
        normalizedName: true,
      },
    }),
    prisma.geographyPlaceAuthority.findMany({
      where: { isActive: true },
      select: {
        id: true,
        censusPlaceGeoid: true,
        name: true,
        normalizedName: true,
        counties: {
          where: { isPrimary: true },
          select: { county: { select: { fipsCode: true } } },
          take: 1,
        },
      },
    }),
    prisma.geographyAlias.findMany({
      where: { isActive: true },
      select: {
        normalizedAlias: true,
        countyId: true,
        placeAuthorityId: true,
      },
    }),
  ]);

  const countiesByFips = new Map(
    counties.map((c) => [
      c.fipsCode,
      {
        id: c.id,
        fipsCode: c.fipsCode,
        normalizedName: c.normalizedName ?? normalizeCountyName(c.name),
        name: c.name,
      },
    ]),
  );

  const countiesByNormalized = new Map<
    string,
    { id: string; fipsCode: string; normalizedName: string; name: string }[]
  >();
  for (const c of countiesByFips.values()) {
    const list = countiesByNormalized.get(c.normalizedName) ?? [];
    list.push(c);
    countiesByNormalized.set(c.normalizedName, list);
  }

  const placesByGeoid = new Map(
    places.map((p) => [
      p.censusPlaceGeoid,
      {
        id: p.id,
        censusPlaceGeoid: p.censusPlaceGeoid,
        normalizedName: p.normalizedName ?? normalizePlaceName(p.name),
        name: p.name,
        primaryCountyFips: p.counties[0]?.county.fipsCode ?? null,
      },
    ]),
  );

  const placesByNormalized = new Map<
    string,
    {
      id: string;
      censusPlaceGeoid: string;
      normalizedName: string;
      name: string;
      primaryCountyFips?: string | null;
    }[]
  >();
  for (const p of placesByGeoid.values()) {
    const list = placesByNormalized.get(p.normalizedName) ?? [];
    list.push(p);
    placesByNormalized.set(p.normalizedName, list);
  }

  const aliasesByNormalized = new Map<
    string,
    { countyId?: string | null; placeAuthorityId?: string | null }[]
  >();
  for (const a of aliases) {
    const list = aliasesByNormalized.get(a.normalizedAlias) ?? [];
    list.push({
      countyId: a.countyId,
      placeAuthorityId: a.placeAuthorityId,
    });
    aliasesByNormalized.set(a.normalizedAlias, list);
  }

  return {
    countiesByFips,
    countiesByNormalized,
    placesByGeoid,
    placesByNormalized,
    aliasesByNormalized,
  };
}

/** Shared IC-01 authority index for other Phase Two readers (e.g. IC-02). */
export async function loadGeographyAuthorityIndex(): Promise<GeographyAuthorityIndex> {
  return buildAuthorityIndex();
}

export async function getGeographyDashboard(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const [
    countyCount,
    placeCount,
    top250Count,
    regionCount,
    corridorCount,
    priorityCount,
    focusAreaCount,
    sourceCount,
    eventGeoActive,
    missionGeoActive,
  ] = await Promise.all([
    prisma.arkansasCounty.count({ where: { isActive: true } }),
    prisma.geographyPlaceAuthority.count({ where: { isActive: true } }),
    prisma.geographyPlaceAuthority.count({
      where: { isActive: true, isTop250: true },
    }),
    prisma.campaignGeographyRegion.count({ where: { isActive: true } }),
    prisma.campaignTravelCorridor.count({ where: { isActive: true } }),
    prisma.campaignCountyPriority.count({ where: { isActive: true } }),
    prisma.campaignFocusArea.count({ where: { isActive: true } }),
    prisma.geographySource.count(),
    prisma.eventGeography.count({ where: { isActive: true } }),
    prisma.missionGeography.count({ where: { isActive: true } }),
  ]);

  return {
    ic01: "COMPLETE",
    authorizationAdr: "ADR-102",
    top250Definition: TOP250_PLACES_DEFINITION,
    counts: {
      counties: countyCount,
      places: placeCount,
      top250Places: top250Count,
      regions: regionCount,
      corridors: corridorCount,
      priorities: priorityCount,
      focusAreas: focusAreaCount,
      sources: sourceCount,
      activeEventGeographies: eventGeoActive,
      activeMissionGeographies: missionGeoActive,
    },
  };
}

export async function listCounties(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.arkansasCounty.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      fipsCode: true,
      geoid: true,
      countySeat: true,
      stateFips: true,
      normalizedName: true,
      seatReviewState: true,
      dataVintage: true,
      sourceKey: true,
    },
  });
}

export async function getCounty(actor: AuthenticatedActor, countyId: string) {
  assertLeadership(actor);
  const county = await prisma.arkansasCounty.findUnique({
    where: { id: countyId },
    include: {
      placeAuthorities: {
        include: {
          placeAuthority: {
            select: {
              id: true,
              name: true,
              censusPlaceGeoid: true,
              populationRank: true,
              placeType: true,
            },
          },
        },
      },
    },
  });
  if (!county) throw new NotFoundError("County not found.");
  return county;
}

export async function listPlaces(
  actor: AuthenticatedActor,
  options?: { top250Only?: boolean },
) {
  assertLeadership(actor);
  return prisma.geographyPlaceAuthority.findMany({
    where: {
      isActive: true,
      ...(options?.top250Only === false ? {} : { isTop250: true }),
    },
    orderBy: [{ populationRank: "asc" }, { censusPlaceGeoid: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      placeType: true,
      censusPlaceGeoid: true,
      population: true,
      populationRank: true,
      populationVintage: true,
      isTop250: true,
      counties: {
        select: {
          isPrimary: true,
          county: { select: { id: true, name: true, fipsCode: true } },
        },
      },
    },
  });
}

export async function getPlace(actor: AuthenticatedActor, placeId: string) {
  assertLeadership(actor);
  const place = await prisma.geographyPlaceAuthority.findUnique({
    where: { id: placeId },
    include: {
      counties: {
        include: {
          county: {
            select: { id: true, name: true, fipsCode: true, countySeat: true },
          },
        },
      },
    },
  });
  if (!place) throw new NotFoundError("Place authority not found.");
  return place;
}

export async function listRegions(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.campaignGeographyRegion.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
}

export async function listCorridors(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.campaignTravelCorridor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { nodes: true } } },
  });
}

export async function listPriorities(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.campaignCountyPriority.findMany({
    where: { isActive: true },
    orderBy: { effectiveAt: "desc" },
    include: {
      county: { select: { id: true, name: true, fipsCode: true } },
    },
  });
}

export async function listFocusAreas(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.campaignFocusArea.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { geographies: true } } },
  });
}

export async function listSources(actor: AuthenticatedActor) {
  assertLeadership(actor);
  return prisma.geographySource.findMany({
    orderBy: { sourceKey: "asc" },
  });
}

export async function previewEventReconciliation(
  actor: AuthenticatedActor,
  input: GeographyReconcileInput & { eventId: string },
): Promise<{ eventId: string; preview: GeographyReconcileResult; fingerprint: string }> {
  assertLeadership(actor);
  if (!input.eventId?.trim()) throw new ValidationError("eventId is required.");
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: { id: true },
  });
  if (!event) throw new NotFoundError("Event not found.");
  const index = await buildAuthorityIndex();
  const preview = reconcileGeography(input, index);
  const fingerprint = fingerprintEvidence({
    subjectType: "EVENT",
    subjectId: input.eventId,
    input,
    preview,
  });
  return { eventId: input.eventId, preview, fingerprint };
}

/**
 * Writes EventGeography only. Does not mutate Event schedule/status fields.
 */
export async function applyEventGeography(
  actor: AuthenticatedActor,
  input: GeographyReconcileInput & {
    eventId: string;
    fingerprint?: string;
  },
) {
  assertLeadership(actor);
  const { eventId, preview, fingerprint } = await previewEventReconciliation(
    actor,
    input,
  );
  if (input.fingerprint && input.fingerprint !== fingerprint) {
    throw new ValidationError("Reconciliation fingerprint mismatch.");
  }

  const existing = await prisma.eventGeography.findFirst({
    where: {
      eventId,
      isActive: true,
      evidenceFingerprint: fingerprint,
    },
  });
  if (existing) {
    return { idempotent: true as const, geography: existing, fingerprint };
  }

  await prisma.eventGeography.updateMany({
    where: { eventId, isActive: true },
    data: { isActive: false, supersededAt: new Date(), outcome: "SUPERSEDED" },
  });

  const geography = await prisma.eventGeography.create({
    data: {
      eventId,
      countyId: preview.countyId,
      placeAuthorityId: preview.placeAuthorityId,
      matchMethod: preview.matchMethod,
      outcome: preview.outcome,
      evidenceFingerprint: fingerprint,
      sourceKey: "ic01-reconcile",
      isActive: true,
      confirmedByUserId:
        preview.matchMethod === "OPERATOR_CONFIRMED" ? actor.userId : null,
      confirmedAt:
        preview.matchMethod === "OPERATOR_CONFIRMED" ? new Date() : null,
    },
  });

  return { idempotent: false as const, geography, fingerprint };
}

export async function previewMissionReconciliation(
  actor: AuthenticatedActor,
  input: GeographyReconcileInput & { missionId: string },
): Promise<{
  missionId: string;
  preview: GeographyReconcileResult;
  fingerprint: string;
}> {
  assertLeadership(actor);
  if (!input.missionId?.trim()) {
    throw new ValidationError("missionId is required.");
  }
  const mission = await prisma.campaignMission.findUnique({
    where: { id: input.missionId },
    select: { id: true },
  });
  if (!mission) throw new NotFoundError("Mission not found.");
  const index = await buildAuthorityIndex();
  const preview = reconcileGeography(input, index);
  const fingerprint = fingerprintEvidence({
    subjectType: "MISSION",
    subjectId: input.missionId,
    input,
    preview,
  });
  return { missionId: input.missionId, preview, fingerprint };
}

/**
 * Writes MissionGeography only. Does not mutate Mission schedule/status fields.
 */
export async function applyMissionGeography(
  actor: AuthenticatedActor,
  input: GeographyReconcileInput & {
    missionId: string;
    fingerprint?: string;
  },
) {
  assertLeadership(actor);
  const { missionId, preview, fingerprint } =
    await previewMissionReconciliation(actor, input);
  if (input.fingerprint && input.fingerprint !== fingerprint) {
    throw new ValidationError("Reconciliation fingerprint mismatch.");
  }

  const existing = await prisma.missionGeography.findFirst({
    where: {
      missionId,
      isActive: true,
      evidenceFingerprint: fingerprint,
    },
  });
  if (existing) {
    return { idempotent: true as const, geography: existing, fingerprint };
  }

  await prisma.missionGeography.updateMany({
    where: { missionId, isActive: true },
    data: { isActive: false, supersededAt: new Date(), outcome: "SUPERSEDED" },
  });

  const geography = await prisma.missionGeography.create({
    data: {
      missionId,
      countyId: preview.countyId,
      placeAuthorityId: preview.placeAuthorityId,
      matchMethod: preview.matchMethod,
      outcome: preview.outcome,
      evidenceFingerprint: fingerprint,
      sourceKey: "ic01-reconcile",
      isActive: true,
      confirmedByUserId:
        preview.matchMethod === "OPERATOR_CONFIRMED" ? actor.userId : null,
      confirmedAt:
        preview.matchMethod === "OPERATOR_CONFIRMED" ? new Date() : null,
    },
  });

  return { idempotent: false as const, geography, fingerprint };
}
