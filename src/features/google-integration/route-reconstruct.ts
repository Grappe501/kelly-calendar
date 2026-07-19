import { computeRouteEstimate } from "@/features/google-integration/routes-client";
import {
  isVirtualOnlyEvent,
  metersToMiles,
  ROUTE_TRUTH_TYPE_ESTIMATE,
} from "@/features/google-integration/routes-truth";
import { getGoogleIntegrationEnv } from "@/features/google-integration/config";
import { prisma } from "@/server/db/prisma";

export type RouteReconstructReport = {
  dryRun: boolean;
  skippedSafely?: boolean;
  reason?: string;
  stopsConsidered: number;
  legsProposed: number;
  legsComputed: number;
  excludedVirtual: number;
  excludedCancelled: number;
  unresolvedLocations: number;
  estimatedMilesTotal: number;
  truthType: typeof ROUTE_TRUTH_TYPE_ESTIMATE;
};

function locationLabel(event: {
  city: string | null;
  venueName: string | null;
  streetAddress: string | null;
}): string | null {
  const parts = [event.venueName, event.streetAddress, event.city].filter(
    (p): p is string => Boolean(p?.trim()),
  );
  return parts.length ? parts.join(", ") : null;
}

export async function reconstructCampaignRoutes(options: {
  apply?: boolean;
  fromIso?: string;
}): Promise<RouteReconstructReport> {
  const env = getGoogleIntegrationEnv();
  const dryRun = options.apply !== true;
  const truthType = ROUTE_TRUTH_TYPE_ESTIMATE;

  if (!env.mapsRoutesApiKey || !env.routesEnabled) {
    return {
      dryRun,
      skippedSafely: true,
      reason: !env.mapsRoutesApiKey
        ? "Routes API key not configured"
        : "KCCC_GOOGLE_ROUTES_ENABLED is false",
      stopsConsidered: 0,
      legsProposed: 0,
      legsComputed: 0,
      excludedVirtual: 0,
      excludedCancelled: 0,
      unresolvedLocations: 0,
      estimatedMilesTotal: 0,
      truthType,
    };
  }

  const from = new Date(options.fromIso ?? env.historyStartIso);
  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
      startsAt: { gte: from },
      status: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      eventNumber: true,
      status: true,
      startsAt: true,
      endsAt: true,
      city: true,
      venueName: true,
      streetAddress: true,
      virtualMeetingUrl: true,
      isAllDay: true,
    },
  });

  let excludedVirtual = 0;
  let excludedCancelled = 0;
  let unresolvedLocations = 0;
  const eligible: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    label: string;
  }> = [];

  for (const event of events) {
    if (event.status === "CANCELLED") {
      excludedCancelled += 1;
      continue;
    }
    if (
      isVirtualOnlyEvent({
        city: event.city,
        venueName: event.venueName,
        virtualMeetingUrl: event.virtualMeetingUrl,
        isAllDay: event.isAllDay,
      })
    ) {
      excludedVirtual += 1;
      continue;
    }
    const label = locationLabel(event);
    if (!label) {
      unresolvedLocations += 1;
      continue;
    }
    eligible.push({
      id: event.id,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      label,
    });
  }

  let legsProposed = 0;
  let legsComputed = 0;
  let estimatedMeters = 0;

  for (let i = 0; i < eligible.length - 1; i++) {
    const fromStop = eligible[i];
    const toStop = eligible[i + 1];
    // Same-city consecutive stops: still a leg if labels differ; skip identical labels.
    if (fromStop.label === toStop.label) continue;
    legsProposed += 1;

    if (dryRun) continue;

    try {
      const estimate = await computeRouteEstimate({
        originAddress: fromStop.label,
        destinationAddress: toStop.label,
      });
      await prisma.campaignTravelLeg.create({
        data: {
          fromEventId: fromStop.id,
          toEventId: toStop.id,
          originLabel: fromStop.label,
          destinationLabel: toStop.label,
          departureWindowStart: fromStop.endsAt,
          arrivalWindowEnd: toStop.startsAt,
          distanceMeters: estimate.distanceMeters,
          durationSeconds: estimate.durationSeconds,
          routeProvider: "GOOGLE_ROUTES",
          routeTruthType: "GOOGLE_ROUTE_ESTIMATE",
          providerRequestVersion: estimate.providerRequestVersion,
          confidence: "MEDIUM",
          reviewStatus: "UNREVIEWED",
        },
      });
      legsComputed += 1;
      estimatedMeters += estimate.distanceMeters;
    } catch {
      await prisma.campaignTravelLeg.create({
        data: {
          fromEventId: fromStop.id,
          toEventId: toStop.id,
          originLabel: fromStop.label,
          destinationLabel: toStop.label,
          routeTruthType: "GOOGLE_ROUTE_ESTIMATE",
          reviewStatus: "AMBIGUOUS",
          ambiguityReason: "routes_api_failed_or_no_route",
          confidence: "LOW",
        },
      });
    }
  }

  if (dryRun) {
    // Approximate dry-run miles as unknown (0) — do not invent.
    estimatedMeters = 0;
  }

  return {
    dryRun,
    stopsConsidered: eligible.length,
    legsProposed,
    legsComputed,
    excludedVirtual,
    excludedCancelled,
    unresolvedLocations,
    estimatedMilesTotal: Number(metersToMiles(estimatedMeters).toFixed(1)),
    truthType,
  };
}

export async function buildRoutesReport() {
  const env = getGoogleIntegrationEnv();
  const from = new Date(env.historyStartIso);
  const legs = await prisma.campaignTravelLeg.findMany({
    where: {
      routeTruthType: "GOOGLE_ROUTE_ESTIMATE",
      reviewStatus: { not: "EXCLUDED" },
      distanceMeters: { not: null },
      computedAt: { gte: from },
    },
  });
  const totalMeters = legs.reduce((sum, leg) => sum + (leg.distanceMeters ?? 0), 0);
  const byMonth = new Map<string, number>();
  for (const leg of legs) {
    const key = leg.computedAt.toISOString().slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (leg.distanceMeters ?? 0));
  }

  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
      startsAt: { gte: from },
      status: { not: "CANCELLED" },
    },
    select: { city: true, countyId: true },
  });
  const cities = new Set(events.map((e) => e.city).filter(Boolean));
  const counties = new Set(events.map((e) => e.countyId).filter(Boolean));

  const corridors = new Map<string, number>();
  for (const leg of legs) {
    if (!leg.originLabel || !leg.destinationLabel) continue;
    const key = `${leg.originLabel} → ${leg.destinationLabel}`;
    corridors.set(key, (corridors.get(key) ?? 0) + 1);
  }

  return {
    truthType: ROUTE_TRUTH_TYPE_ESTIMATE,
    language: "Estimated campaign route distance (not actual miles driven)",
    estimatedCampaignMilesSinceHistoryStart: Number(metersToMiles(totalMeters).toFixed(1)),
    estimatedMilesByMonth: Object.fromEntries(
      [...byMonth.entries()].map(([k, meters]) => [k, Number(metersToMiles(meters).toFixed(1))]),
    ),
    campaignStops: events.length,
    uniqueCities: cities.size,
    uniqueCounties: counties.size,
    repeatedCorridors: [...corridors.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([corridor, count]) => ({ corridor, count })),
    unresolvedOrAmbiguousLegs: await prisma.campaignTravelLeg.count({
      where: { reviewStatus: { in: ["AMBIGUOUS", "EXCLUDED"] } },
    }),
    note: "District/region mileage requires geographic enrichment (Historical Campaign Memory Pass C).",
  };
}
