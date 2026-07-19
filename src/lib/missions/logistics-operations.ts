/**
 * Step 7.6 — Logistics Operations (pure aggregation).
 * Answers: Can we actually execute today's plan?
 *
 * Canonical owner of travel/venue/materials/equipment operational readiness.
 * Not a fleet GPS app. Live ETA, booking confirmations, and fleet inventory
 * remain first-class Unknown.
 *
 * Doctrine: Operational readiness equals the minimum readiness of all
 * required operational domains (not an average / optimistic %).
 */

import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { UnknownFact, KnownNumber } from "@/lib/missions/volunteer-operations";

export type DomainReadiness =
  | "READY"
  | "NEEDS_ATTENTION"
  | "BLOCKED"
  | "NOT_REQUIRED"
  | "UNKNOWN";

export type LogisticsPlanSnapshot = {
  travelRequired: boolean;
  hasDriver: boolean;
  hasVehicleDescription: boolean;
  departureAt: string | null;
  targetArrivalAt: string | null;
  estimatedDurationMinutes: number | null;
  bufferMinutes: number | null;
  estimatedDistanceMiles: number | null;
  rentalRequired: boolean;
  flightRequired: boolean;
  lodgingRequired: boolean;
  overnightStay: boolean;
  packingCount: number;
  packingPackedCount: number;
  packingLoadedCount: number;
  packingDeliveredCount: number;
  packingSignageCount: number;
  packingSignagePackedCount: number;
  packingLiteratureCount: number;
  packingLiteraturePackedCount: number;
  venueName: string | null;
  city: string | null;
  hasStreetAddress: boolean;
  locationPresent: boolean;
};

export type LogisticsMissionRow = {
  missionId: string;
  missionTitle: string;
  countyName: string | null;
  whenLabel: string;
  href: string;
  domains: {
    travel: DomainReadiness;
    transportation: DomainReadiness;
    venue: DomainReadiness;
    materials: DomainReadiness;
    lodging: DomainReadiness;
  };
  /** Minimum of required domains — never an average. */
  missionReadiness: DomainReadiness;
  travelRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  openMaterialCount: number;
  logisticsBlockers: string[];
};

export type LogisticsCountyRow = {
  countyName: string;
  slug: string;
  venueReadiness: DomainReadiness;
  transportationReadiness: DomainReadiness;
  materialAvailability: KnownNumber | UnknownFact;
  resourceInventory: UnknownFact;
  localLogisticsCoordinator: UnknownFact;
  logisticsRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
};

export type LogisticsOperationsHome = {
  title: "LOGISTICS OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  travelRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  venueReadinessSummary: KnownNumber;
  vehicleStatus: UnknownFact;
  materialReadiness: KnownNumber;
  equipmentIssues: UnknownFact;
  logisticsBlockers: KnownNumber;
  missionRows: LogisticsMissionRow[];
  countyRows: LogisticsCountyRow[];
  unknowns: Array<{ fact: string; reason: string }>;
  executiveFeed: {
    travelRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    venueNotReady: number;
    vehicleStatusUnknown: true;
    materialsAtRisk: number;
    equipmentIssuesUnknown: true;
    logisticsBlockers: number;
    topBlockers: Array<{ label: string; detail: string; href: string }>;
    briefingLine: string;
  };
  countyFeed: LogisticsCountyRow[];
  fieldFeed: {
    missions: Array<{
      missionId: string;
      assignedVehicle: "UNKNOWN" | "DESCRIBED" | "NOT_REQUIRED";
      travelConfidence: DomainReadiness;
      materialDeliveryStatus: DomainReadiness;
      venueAccess: DomainReadiness;
      setupReadiness: DomainReadiness;
      missionLogisticsReadiness: DomainReadiness;
    }>;
  };
  communicationsFeed: {
    literatureAvailable: DomainReadiness | "UNKNOWN";
    signageStatus: DomainReadiness | "UNKNOWN";
    mediaKitDelivered: UnknownFact;
    pressBackdropAvailable: UnknownFact;
    missionsWithLiteraturePacked: number;
    missionsWithSignagePacked: number;
  };
  volunteerFeed: {
    driverAssignmentsKnown: number;
    driverAssignmentsNeeded: number;
    transportationAvailability: DomainReadiness | "UNKNOWN";
    equipmentIssued: UnknownFact;
    checkoutStatus: UnknownFact;
  };
  /** Consumed from Finance — travel/lodging/supply authorizations. */
  financeConsume: FinanceOperationsHome["logisticsFeed"] | null;
};

export type LogisticsMissionInput = {
  mission: MissionCard;
  countyName: string | null;
  logistics: LogisticsPlanSnapshot | null;
};

const VEHICLE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Vehicle fleet / assignment registry is not yet available because its owning sub-surface has not been implemented.",
};

const EQUIPMENT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Equipment issue tracking is Unknown — no equipment registry surface yet.",
};

const INVENTORY_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "County resource inventory is Unknown — Logistics Operations owns plan readiness, not warehouse stock yet.",
};

const COORDINATOR_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Local logistics coordinator registry is not yet implemented — Unknown, not false.",
};

const MEDIA_KIT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Media kit delivery confirmation is Unknown — no asset handoff surface yet.",
};

const BACKDROP_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Press backdrop availability is Unknown — no venue kit checklist surface yet.",
};

const CHECKOUT_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Equipment check-out/check-in status is Unknown — no issue/return surface yet.",
};

const DOMAIN_RANK: Record<DomainReadiness, number> = {
  BLOCKED: 0,
  NEEDS_ATTENTION: 1,
  UNKNOWN: 2,
  READY: 3,
  NOT_REQUIRED: 4,
};

/**
 * Operational readiness = minimum of required domains (NOT_REQUIRED ignored).
 * Never averages; one BLOCKED domain → BLOCKED mission.
 */
export function combineOperationalReadiness(
  domains: DomainReadiness[],
): DomainReadiness {
  const required = domains.filter((d) => d !== "NOT_REQUIRED");
  if (required.length === 0) return "UNKNOWN";
  let worst: DomainReadiness = "READY";
  for (const d of required) {
    if (DOMAIN_RANK[d] < DOMAIN_RANK[worst]) worst = d;
  }
  return worst;
}

function emptyLogistics(): LogisticsPlanSnapshot {
  return {
    travelRequired: false,
    hasDriver: false,
    hasVehicleDescription: false,
    departureAt: null,
    targetArrivalAt: null,
    estimatedDurationMinutes: null,
    bufferMinutes: null,
    estimatedDistanceMiles: null,
    rentalRequired: false,
    flightRequired: false,
    lodgingRequired: false,
    overnightStay: false,
    packingCount: 0,
    packingPackedCount: 0,
    packingLoadedCount: 0,
    packingDeliveredCount: 0,
    packingSignageCount: 0,
    packingSignagePackedCount: 0,
    packingLiteratureCount: 0,
    packingLiteraturePackedCount: 0,
    venueName: null,
    city: null,
    hasStreetAddress: false,
    locationPresent: false,
  };
}

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function deriveTravelDomain(snap: LogisticsPlanSnapshot): DomainReadiness {
  if (!snap.travelRequired) return "NOT_REQUIRED";
  if (!snap.hasDriver) return "BLOCKED";
  if (!snap.departureAt && !snap.targetArrivalAt) return "NEEDS_ATTENTION";
  if (snap.estimatedDurationMinutes == null) return "NEEDS_ATTENTION";
  return "READY";
}

export function deriveTransportationDomain(
  snap: LogisticsPlanSnapshot,
): DomainReadiness {
  if (!snap.travelRequired) return "NOT_REQUIRED";
  if (!snap.hasDriver) return "BLOCKED";
  // Vehicle fleet registry unknown — described vehicle is partial signal only
  if (!snap.hasVehicleDescription) return "UNKNOWN";
  return "READY";
}

export function deriveVenueDomain(snap: LogisticsPlanSnapshot): DomainReadiness {
  if (!snap.locationPresent) return "BLOCKED";
  if (!snap.venueName && !snap.city) return "NEEDS_ATTENTION";
  if (!snap.hasStreetAddress) return "NEEDS_ATTENTION";
  return "READY";
}

export function deriveMaterialsDomain(snap: LogisticsPlanSnapshot): DomainReadiness {
  if (snap.packingCount === 0) return "NOT_REQUIRED";
  const open = snap.packingCount - snap.packingPackedCount;
  if (open <= 0) return "READY";
  if (snap.packingPackedCount === 0) return "BLOCKED";
  return "NEEDS_ATTENTION";
}

export function deriveLodgingDomain(snap: LogisticsPlanSnapshot): DomainReadiness {
  if (!snap.lodgingRequired && !snap.overnightStay) return "NOT_REQUIRED";
  // Booking confirmation not modeled — Unknown, not assumed ready
  return "UNKNOWN";
}

function travelRiskFrom(domains: LogisticsMissionRow["domains"]): LogisticsMissionRow["travelRisk"] {
  const t = combineOperationalReadiness([domains.travel, domains.transportation]);
  if (t === "BLOCKED") return "CRITICAL";
  if (t === "NEEDS_ATTENTION") return "HIGH";
  if (t === "UNKNOWN") return "WATCH";
  if (t === "READY") return "LOW";
  return "UNKNOWN";
}

export function buildLogisticsMissionRow(
  input: LogisticsMissionInput,
): LogisticsMissionRow {
  const snap = input.logistics ?? emptyLogistics();
  const domains = {
    travel: deriveTravelDomain(snap),
    transportation: deriveTransportationDomain(snap),
    venue: deriveVenueDomain(snap),
    materials: deriveMaterialsDomain(snap),
    lodging: deriveLodgingDomain(snap),
  };
  const missionReadiness = combineOperationalReadiness([
    domains.travel,
    domains.transportation,
    domains.venue,
    domains.materials,
    domains.lodging,
  ]);
  const openMaterialCount = Math.max(0, snap.packingCount - snap.packingPackedCount);
  const logisticsBlockers: string[] = [];
  if (domains.travel === "BLOCKED") logisticsBlockers.push("Driver missing");
  if (domains.transportation === "BLOCKED") logisticsBlockers.push("Transportation blocked");
  if (domains.venue === "BLOCKED") logisticsBlockers.push("Venue unknown");
  if (domains.materials === "BLOCKED") logisticsBlockers.push("Materials not packed");
  if (domains.lodging === "UNKNOWN" && (snap.lodgingRequired || snap.overnightStay)) {
    logisticsBlockers.push("Lodging confirmation Unknown");
  }

  return {
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    countyName: input.countyName,
    whenLabel: input.mission.whenLabel,
    href: `/calendar?event=${input.mission.missionId}`,
    domains,
    missionReadiness,
    travelRisk: travelRiskFrom(domains),
    openMaterialCount,
    logisticsBlockers,
  };
}

function riskRank(r: LogisticsMissionRow["travelRisk"]): number {
  return r === "CRITICAL" ? 0 : r === "HIGH" ? 1 : r === "WATCH" ? 2 : r === "UNKNOWN" ? 3 : 4;
}

function domainRank(d: DomainReadiness): number {
  return DOMAIN_RANK[d];
}

function buildCountyRow(
  countyName: string,
  missions: LogisticsMissionRow[],
  snaps: LogisticsPlanSnapshot[],
): LogisticsCountyRow {
  let venue: DomainReadiness = "UNKNOWN";
  let transport: DomainReadiness = "UNKNOWN";
  let logisticsRisk: LogisticsCountyRow["logisticsRisk"] =
    missions.length === 0 ? "UNKNOWN" : "LOW";
  for (const m of missions) {
    if (domainRank(m.domains.venue) < domainRank(venue)) venue = m.domains.venue;
    if (domainRank(m.domains.transportation) < domainRank(transport)) {
      transport = m.domains.transportation;
    }
    if (riskRank(m.travelRisk) < riskRank(logisticsRisk)) logisticsRisk = m.travelRisk;
  }
  const packingTotal = snaps.reduce((s, x) => s + x.packingCount, 0);
  const packingPacked = snaps.reduce((s, x) => s + x.packingPackedCount, 0);

  return {
    countyName,
    slug: countySlug(countyName),
    venueReadiness: venue,
    transportationReadiness: transport,
    materialAvailability:
      packingTotal === 0
        ? {
            status: "unknown",
            value: null,
            reason:
              "No packing plan for this county today — material availability Unknown (not zero).",
          }
        : {
            status: "known",
            value: Math.round((packingPacked / packingTotal) * 100),
            note: `${packingPacked}/${packingTotal} packing items packed`,
          },
    resourceInventory: INVENTORY_UNKNOWN,
    localLogisticsCoordinator: COORDINATOR_UNKNOWN,
    logisticsRisk,
  };
}

export function buildLogisticsOperationsHome(input: {
  date: string;
  timezone: string;
  missions: LogisticsMissionInput[];
  now?: Date;
  financeConsume?: LogisticsOperationsHome["financeConsume"];
}): LogisticsOperationsHome {
  const now = input.now ?? new Date();
  const missionRows = input.missions
    .map(buildLogisticsMissionRow)
    .sort(
      (a, b) =>
        domainRank(a.missionReadiness) - domainRank(b.missionReadiness) ||
        b.logisticsBlockers.length - a.logisticsBlockers.length,
    );

  const snaps = input.missions.map((m) => m.logistics ?? emptyLogistics());
  const venueNotReady = missionRows.filter(
    (m) => m.domains.venue === "BLOCKED" || m.domains.venue === "NEEDS_ATTENTION",
  ).length;
  const materialsAtRisk = missionRows.filter(
    (m) =>
      m.domains.materials === "BLOCKED" || m.domains.materials === "NEEDS_ATTENTION",
  ).length;
  const logisticsBlockers = missionRows.filter(
    (m) => m.missionReadiness === "BLOCKED" || m.logisticsBlockers.length > 0,
  ).length;

  let travelRisk: LogisticsOperationsHome["travelRisk"] = "LOW";
  if (missionRows.length === 0) travelRisk = "UNKNOWN";
  for (const m of missionRows) {
    if (riskRank(m.travelRisk) < riskRank(travelRisk)) travelRisk = m.travelRisk;
  }

  const byCounty = new Map<
    string,
    { rows: LogisticsMissionRow[]; snaps: LogisticsPlanSnapshot[] }
  >();
  input.missions.forEach((m, i) => {
    const key = m.countyName?.trim() || "Unspecified";
    const bucket = byCounty.get(key) ?? { rows: [], snaps: [] };
    bucket.rows.push(missionRows[i]!);
    bucket.snaps.push(snaps[i]!);
    byCounty.set(key, bucket);
  });
  const countyRows = [...byCounty.entries()]
    .map(([name, b]) => buildCountyRow(name, b.rows, b.snaps))
    .sort(
      (a, b) =>
        riskRank(a.logisticsRisk) - riskRank(b.logisticsRisk) ||
        a.countyName.localeCompare(b.countyName),
    );

  const topBlockers = missionRows
    .filter((m) => m.missionReadiness === "BLOCKED" || m.logisticsBlockers.length > 0)
    .slice(0, 5)
    .map((m) => ({
      label: m.countyName || m.missionTitle,
      detail:
        m.logisticsBlockers.length > 0
          ? `${m.logisticsBlockers.join("; ")} · ${m.missionTitle}`
          : `Logistics ${m.missionReadiness} · ${m.missionTitle}`,
      href: m.href,
    }));

  const driversNeeded = snaps.filter((s) => s.travelRequired).length;
  const driversKnown = snaps.filter((s) => s.travelRequired && s.hasDriver).length;
  const litMissions = snaps.filter((s) => s.packingLiteratureCount > 0).length;
  const signMissions = snaps.filter((s) => s.packingSignageCount > 0).length;
  const litPacked = snaps.filter(
    (s) =>
      s.packingLiteratureCount > 0 &&
      s.packingLiteraturePackedCount >= s.packingLiteratureCount,
  ).length;
  const signPacked = snaps.filter(
    (s) =>
      s.packingSignageCount > 0 &&
      s.packingSignagePackedCount >= s.packingSignageCount,
  ).length;

  const briefingParts: string[] = [];
  if (logisticsBlockers > 0) {
    briefingParts.push(
      `${logisticsBlockers} mission${logisticsBlockers === 1 ? "" : "s"} have logistics blockers.`,
    );
  }
  if (materialsAtRisk > 0) {
    briefingParts.push(
      `${materialsAtRisk} mission${materialsAtRisk === 1 ? "" : "s"} with materials at risk.`,
    );
  }
  if (venueNotReady > 0) {
    briefingParts.push(
      `${venueNotReady} mission${venueNotReady === 1 ? "" : "s"} with venue gaps.`,
    );
  }
  if (briefingParts.length === 0) {
    briefingParts.push(
      missionRows.length > 0
        ? "No logistics blockers flagged from today’s permissioned travel/packing plans."
        : "No missions today — logistics readiness Unknown, not clear.",
    );
  }
  briefingParts.push("Vehicle fleet status Unknown.");

  return {
    title: "LOGISTICS OPERATIONS",
    date: input.date,
    timezone: input.timezone,
    lastUpdatedAt: now.toISOString(),
    travelRisk,
    venueReadinessSummary: {
      status: "known",
      value: venueNotReady,
      note: "Missions with venue BLOCKED or NEEDS_ATTENTION.",
    },
    vehicleStatus: VEHICLE_UNKNOWN,
    materialReadiness: {
      status: "known",
      value: materialsAtRisk,
      note: "Missions with materials BLOCKED or NEEDS_ATTENTION.",
    },
    equipmentIssues: EQUIPMENT_UNKNOWN,
    logisticsBlockers: {
      status: "known",
      value: logisticsBlockers,
      note: "Missions with BLOCKED logistics readiness or explicit blockers.",
    },
    missionRows,
    countyRows,
    unknowns: [
      { fact: "Vehicle fleet status", reason: VEHICLE_UNKNOWN.reason },
      { fact: "Equipment issues", reason: EQUIPMENT_UNKNOWN.reason },
      { fact: "County resource inventory", reason: INVENTORY_UNKNOWN.reason },
      { fact: "Logistics coordinators", reason: COORDINATOR_UNKNOWN.reason },
      {
        fact: "Live ETA / traffic",
        reason:
          "Live travel ETA is Unknown — Logistics Operations is not a GPS client.",
      },
      {
        fact: "Lodging / rental booking confirmation",
        reason:
          "Booking confirmation refs are Unknown — flags exist, confirmations do not.",
      },
      { fact: "Media kit / backdrop delivery", reason: MEDIA_KIT_UNKNOWN.reason },
      { fact: "Equipment check-out", reason: CHECKOUT_UNKNOWN.reason },
    ],
    executiveFeed: {
      travelRisk,
      venueNotReady,
      vehicleStatusUnknown: true,
      materialsAtRisk,
      equipmentIssuesUnknown: true,
      logisticsBlockers,
      topBlockers,
      briefingLine: briefingParts.join(" "),
    },
    countyFeed: countyRows,
    fieldFeed: {
      missions: missionRows.map((m, i) => {
        const snap = snaps[i]!;
        return {
          missionId: m.missionId,
          assignedVehicle: !snap.travelRequired
            ? ("NOT_REQUIRED" as const)
            : snap.hasVehicleDescription
              ? ("DESCRIBED" as const)
              : ("UNKNOWN" as const),
          travelConfidence: m.domains.travel,
          materialDeliveryStatus: m.domains.materials,
          venueAccess: m.domains.venue,
          setupReadiness: combineOperationalReadiness([
            m.domains.venue,
            m.domains.materials,
          ]),
          missionLogisticsReadiness: m.missionReadiness,
        };
      }),
    },
    communicationsFeed: {
      literatureAvailable:
        litMissions === 0
          ? "UNKNOWN"
          : litPacked === litMissions
            ? "READY"
            : litPacked === 0
              ? "BLOCKED"
              : "NEEDS_ATTENTION",
      signageStatus:
        signMissions === 0
          ? "UNKNOWN"
          : signPacked > 0
            ? "NEEDS_ATTENTION"
            : "UNKNOWN",
      mediaKitDelivered: MEDIA_KIT_UNKNOWN,
      pressBackdropAvailable: BACKDROP_UNKNOWN,
      missionsWithLiteraturePacked: litPacked,
      missionsWithSignagePacked: signPacked,
    },
    volunteerFeed: {
      driverAssignmentsKnown: driversKnown,
      driverAssignmentsNeeded: driversNeeded,
      transportationAvailability:
        driversNeeded === 0
          ? "NOT_REQUIRED"
          : driversKnown === driversNeeded
            ? "READY"
            : driversKnown === 0
              ? "BLOCKED"
              : "NEEDS_ATTENTION",
      equipmentIssued: CHECKOUT_UNKNOWN,
      checkoutStatus: CHECKOUT_UNKNOWN,
    },
    financeConsume: input.financeConsume ?? null,
  };
}

export function logisticsOperationsForAdvisory(home: LogisticsOperationsHome) {
  return {
    date: home.date,
    travelRisk: home.travelRisk,
    logisticsBlockers: home.logisticsBlockers,
    materialReadiness: home.materialReadiness,
    venueReadinessSummary: home.venueReadinessSummary,
    vehicleStatus: home.vehicleStatus,
    topBlockers: home.executiveFeed.topBlockers,
    unknowns: home.unknowns,
    executiveFeed: home.executiveFeed,
  };
}

export function countyLogisticsFact(
  feed: LogisticsCountyRow[] | null | undefined,
  countyName: string,
): LogisticsCountyRow | null {
  if (!feed) return null;
  const key = countyName.trim().toLowerCase();
  return feed.find((c) => c.countyName.toLowerCase() === key) ?? null;
}
