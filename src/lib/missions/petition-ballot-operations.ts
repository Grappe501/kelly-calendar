/**
 * Phase 2.5 — Petition & Ballot Operations (pure orchestration).
 * Answers: Can we successfully qualify, defend, and execute a petition
 * or ballot initiative campaign?
 *
 * Campaign capability — not election administration. Coordinates County,
 * Volunteer, Communications, Logistics, Compliance, and Field — does not
 * own signatures, voter file, official validation, or election schedules.
 *
 * Doctrine: Capabilities coordinate campaign strategy; operational systems
 * provide execution truth.
 */

import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import {
  combineOperationalReadiness,
  type DomainReadiness,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { MissionCard } from "@/lib/missions/mission-card";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { UnknownFact } from "@/lib/missions/volunteer-operations";

export type PetitionActivityKind =
  | "SIGNATURE_DRIVE"
  | "CIRCULATOR_TRAINING"
  | "CIRCULATOR_DEPLOYMENT"
  | "VALIDATION_REVIEW"
  | "BALLOT_EDUCATION"
  | "LEGAL_MILESTONE"
  | "COALITION"
  | "PETITION_OTHER"
  | "NOT_PETITION";

export type PetitionReadinessDomain =
  | "InitiativeLifecycle"
  | "CollectionPlan"
  | "CirculatorDeployment"
  | "CountyCoverage"
  | "ValidationWorkflow"
  | "LegalMilestones"
  | "EducationMessaging";

export type PetitionDomainCell = {
  domain: PetitionReadinessDomain;
  state: DomainReadiness;
  source: string;
  detail: string;
};

export type PetitionActivityRow = {
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  href: string;
  kind: PetitionActivityKind;
  countyName: string | null;
  domains: PetitionDomainCell[];
  deploymentReadiness: DomainReadiness;
  objectives: string;
};

export type PetitionCountySignal = {
  countyName: string;
  slug: string;
  collectionReadiness: DomainReadiness;
  volunteerDeployment: DomainReadiness;
  signatureCoverageGoal: UnknownFact;
  localCoalitionActivity: DomainReadiness;
  activityCount: number;
};

export type PetitionBallotOperationsHome = {
  title: "PETITION & BALLOT OPERATIONS";
  date: string;
  timezone: string;
  lastUpdatedAt: string;
  doctrine: "coordinates campaign strategy — operational systems provide execution truth";
  petitionReadiness: DomainReadiness;
  collectionProgress: KnownOrUnknown;
  countyCoverage: DomainReadiness;
  validationRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
  legalMilestones: UnknownFact;
  educationReadiness: DomainReadiness;
  activityRows: PetitionActivityRow[];
  readinessDomains: PetitionDomainCell[];
  countySignals: PetitionCountySignal[];
  unknowns: Array<{ fact: string; reason: string }>;
  candidateFeed: {
    petitionCampaignStops: number;
    publicEducationEvents: number;
    mediaOpportunities: string[];
    signatureDriveObjectives: string[];
    preparationStatus: DomainReadiness;
    briefingLine: string;
  };
  countyFeed: PetitionCountySignal[];
  volunteerFeed: {
    circulatorAssignments: KnownOrUnknown;
    trainingCompletion: UnknownFact;
    eventStaffing: KnownOrUnknown;
    countyDeployment: number;
    briefingLine: string;
  };
  communicationsFeed: {
    educationalCampaignsStatus: "unknown";
    messagingPackagesStatus: "unknown";
    faqReadinessStatus: "unknown";
    publicOutreachTimingStatus: "unknown";
    petitionActivityCount: number;
    briefingLine: string;
  };
  intelligenceFeed: {
    countyCollectionTrendsStatus: "unknown";
    deploymentEffectivenessStatus: "unknown";
    validationRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    geographicCoverageGapsSignal: boolean;
    executionBottlenecks: number;
    briefingLine: string;
  };
  executiveFeed: {
    petitionReadiness: DomainReadiness;
    collectionProgressStatus: "unknown";
    collectionProgressValue: null;
    countyCoverage: DomainReadiness;
    validationRisk: "CRITICAL" | "HIGH" | "WATCH" | "LOW" | "UNKNOWN";
    legalMilestonesStatus: "unknown";
    educationReadiness: DomainReadiness;
    activitiesAtRisk: number;
    briefingLine: string;
  };
};

type KnownOrUnknown =
  | { status: "known"; value: number }
  | { status: "unknown"; value: null; reason: string };

const SIGNATURES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Petition signatures are Unknown — Petition & Ballot owns collection plans, not raw signature custody.",
};

const OFFICIAL_VALIDATION_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Official validation results are Unknown — election administration owns certified counts; this capability tracks workflow status only.",
};

const VOTER_FILE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Voter registration / voter file is Unknown — Petition & Ballot is not a voter database.",
};

const ELECTION_SCHEDULE_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Election schedules are Unknown — calendar/election administration owns official dates; Petition tracks legal milestone workflow.",
};

const COUNTY_ELECTION_RECORDS_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "County election records are Unknown — County Operations owns county readiness; election offices own official records.",
};

const LEGAL_MILESTONES_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Legal milestone registry is Unknown — Compliance owns filing facts; Petition tracks milestone workflow surface only.",
};

const TRAINING_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Circulator training completion is Unknown — Volunteer Ops owns capacity fill; training inventory not implemented.",
};

const COVERAGE_GOAL_UNKNOWN: UnknownFact = {
  status: "unknown",
  value: null,
  reason:
    "Signature coverage goals (numeric) are Unknown — county objectives are workflow signals, not certified quotas.",
};

function countySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function classifyPetitionActivity(input: {
  title: string;
}): PetitionActivityKind {
  const t = input.title.toLowerCase();
  if (
    /\bsignature drive\b|\bsignature collection\b|\bcollect signatures\b|\bpetition drive\b/.test(
      t,
    )
  ) {
    return "SIGNATURE_DRIVE";
  }
  if (/\bcirculator train\b|\bpetition train\b|\bcirculator training\b/.test(t)) {
    return "CIRCULATOR_TRAINING";
  }
  if (/\bcirculator\b|\bpetition canvass\b/.test(t)) {
    return "CIRCULATOR_DEPLOYMENT";
  }
  if (/\bvalidation\b|\bsignature review\b|\bcure\b/.test(t)) {
    return "VALIDATION_REVIEW";
  }
  if (
    /\bballot education\b|\beducation campaign\b|\binitiative education\b|\bfaq\b/.test(
      t,
    )
  ) {
    return "BALLOT_EDUCATION";
  }
  if (
    /\blegal milestone\b|\bfiling deadline\b|\bballot title\b|\bqualification\b/.test(
      t,
    )
  ) {
    return "LEGAL_MILESTONE";
  }
  if (/\bcoalition\b|\bpetition coalition\b/.test(t)) return "COALITION";
  if (/\bpetition\b|\bballot initiative\b|\binitiative campaign\b/.test(t)) {
    return "PETITION_OTHER";
  }
  return "NOT_PETITION";
}

function mapSchedule(mission: MissionCard): DomainReadiness {
  const state = mission.todayReadiness.state;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCirculatorDeployment(
  kind: PetitionActivityKind,
  volunteer?: VolunteerOperationsHome["fieldFeed"]["missions"][number],
): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (
    kind === "BALLOT_EDUCATION" ||
    kind === "LEGAL_MILESTONE" ||
    kind === "VALIDATION_REVIEW"
  ) {
    return "NOT_REQUIRED";
  }
  if (!volunteer) return "UNKNOWN";
  if (volunteer.openRoles > 0 && !volunteer.volunteerLeadAssigned) {
    return "BLOCKED";
  }
  if (volunteer.openRoles > 0) return "NEEDS_ATTENTION";
  if (volunteer.volunteerLeadAssigned && volunteer.staffingPlanDefined) {
    return "READY";
  }
  if (volunteer.volunteerLeadAssigned) return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapCountyCoverage(
  kind: PetitionActivityKind,
  countyName: string | null,
  countyFeed: CountyOperationsHome["executiveFeed"] | null,
): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (!countyName) return "NEEDS_ATTENTION";
  if (!countyFeed) return "UNKNOWN";
  if (countyFeed.needsImmediate > 0) {
    const weak = countyFeed.topWeak.some(
      (w) => w.countyName.toLowerCase() === countyName.toLowerCase(),
    );
    if (weak) return "NEEDS_ATTENTION";
  }
  return "READY";
}

function mapCollectionPlan(kind: PetitionActivityKind): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (
    kind === "SIGNATURE_DRIVE" ||
    kind === "CIRCULATOR_DEPLOYMENT" ||
    kind === "PETITION_OTHER"
  ) {
    return "UNKNOWN";
  }
  return "NOT_REQUIRED";
}

function mapValidationWorkflow(kind: PetitionActivityKind): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (kind === "VALIDATION_REVIEW") return "UNKNOWN";
  return "NOT_REQUIRED";
}

function mapLegalMilestones(
  kind: PetitionActivityKind,
  compliance?: ComplianceOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (kind !== "LEGAL_MILESTONE" && kind !== "PETITION_OTHER") {
    return "NOT_REQUIRED";
  }
  if (!compliance) return "UNKNOWN";
  const state = compliance.triple.complianceState;
  if (state === "READY") return "READY";
  if (state === "BLOCKED") return "BLOCKED";
  if (state === "NEEDS_ATTENTION") return "NEEDS_ATTENTION";
  return "UNKNOWN";
}

function mapEducationMessaging(
  kind: PetitionActivityKind,
  communications?: CommunicationsOperationsHome["missionRows"][number],
): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  if (
    kind !== "BALLOT_EDUCATION" &&
    kind !== "PETITION_OTHER" &&
    kind !== "COALITION"
  ) {
    return "NOT_REQUIRED";
  }
  if (!communications) return "UNKNOWN";
  if (communications.talkingPointsReady) return "READY";
  if (communications.hasTalkingPoints || communications.planDefined) {
    if (communications.messagingRisk === "CRITICAL") return "BLOCKED";
    return "NEEDS_ATTENTION";
  }
  return "UNKNOWN";
}

function mapInitiativeLifecycle(
  kind: PetitionActivityKind,
  schedule: DomainReadiness,
): DomainReadiness {
  if (kind === "NOT_PETITION") return "NOT_REQUIRED";
  return schedule;
}

function buildActivityDomains(input: {
  mission: MissionCard;
  kind: PetitionActivityKind;
  countyName: string | null;
  volunteer?: VolunteerOperationsHome["fieldFeed"]["missions"][number];
  logistics?: LogisticsOperationsHome["missionRows"][number];
  communications?: CommunicationsOperationsHome["missionRows"][number];
  compliance?: ComplianceOperationsHome["missionRows"][number];
  countyFeed: CountyOperationsHome["executiveFeed"] | null;
}): PetitionDomainCell[] {
  const schedule = mapSchedule(input.mission);
  return [
    {
      domain: "InitiativeLifecycle",
      state: mapInitiativeLifecycle(input.kind, schedule),
      source: "Petition & Ballot + Calendar",
      detail:
        input.kind === "NOT_PETITION"
          ? "Not a petition/ballot activity."
          : `Initiative lifecycle readiness ${mapInitiativeLifecycle(input.kind, schedule)}`,
    },
    {
      domain: "CollectionPlan",
      state: mapCollectionPlan(input.kind),
      source: "Petition & Ballot Operations",
      detail:
        mapCollectionPlan(input.kind) === "UNKNOWN"
          ? SIGNATURES_UNKNOWN.reason
          : `Collection plan ${mapCollectionPlan(input.kind)}`,
    },
    {
      domain: "CirculatorDeployment",
      state: mapCirculatorDeployment(input.kind, input.volunteer),
      source: "Volunteer Operations (consumed)",
      detail: `Circulator deployment ${mapCirculatorDeployment(input.kind, input.volunteer)}`,
    },
    {
      domain: "CountyCoverage",
      state: mapCountyCoverage(input.kind, input.countyName, input.countyFeed),
      source: "County Operations (consumed)",
      detail: input.countyName
        ? `County coverage signal for ${input.countyName}`
        : "County Unknown — coverage incomplete.",
    },
    {
      domain: "ValidationWorkflow",
      state: mapValidationWorkflow(input.kind),
      source: "Petition & Ballot Operations",
      detail:
        mapValidationWorkflow(input.kind) === "UNKNOWN"
          ? OFFICIAL_VALIDATION_UNKNOWN.reason
          : `Validation workflow ${mapValidationWorkflow(input.kind)}`,
    },
    {
      domain: "LegalMilestones",
      state: mapLegalMilestones(input.kind, input.compliance),
      source: "Compliance Operations (consumed)",
      detail: `Legal milestone workflow ${mapLegalMilestones(input.kind, input.compliance)}`,
    },
    {
      domain: "EducationMessaging",
      state: mapEducationMessaging(input.kind, input.communications),
      source: "Communications Operations (consumed)",
      detail: `Ballot education messaging ${mapEducationMessaging(input.kind, input.communications)}`,
    },
  ];
}

function dayDomains(rows: PetitionActivityRow[]): PetitionDomainCell[] {
  const order: PetitionReadinessDomain[] = [
    "InitiativeLifecycle",
    "CollectionPlan",
    "CirculatorDeployment",
    "CountyCoverage",
    "ValidationWorkflow",
    "LegalMilestones",
    "EducationMessaging",
  ];
  const petition = rows.filter((r) => r.kind !== "NOT_PETITION");
  return order.map((domain) => {
    if (petition.length === 0) {
      return {
        domain,
        state: "NOT_REQUIRED" as DomainReadiness,
        source: "Petition & Ballot Operations",
        detail: "No petition/ballot activities today — domain not required.",
      };
    }
    const states = petition.map(
      (r) => r.domains.find((d) => d.domain === domain)?.state ?? "UNKNOWN",
    );
    const state = combineOperationalReadiness(states);
    const sample = petition[0]?.domains.find((d) => d.domain === domain);
    return {
      domain,
      state,
      source: sample?.source ?? "Petition & Ballot Operations",
      detail: sample?.detail ?? `${domain} ${state}`,
    };
  });
}

function objectivesFor(kind: PetitionActivityKind, title: string): string {
  switch (kind) {
    case "SIGNATURE_DRIVE":
      return `Signature collection plan: ${title}`;
    case "CIRCULATOR_TRAINING":
      return `Circulator training objective: ${title}`;
    case "CIRCULATOR_DEPLOYMENT":
      return `Circulator deployment objective: ${title}`;
    case "VALIDATION_REVIEW":
      return `Validation workflow status: ${title}`;
    case "BALLOT_EDUCATION":
      return `Ballot education planning: ${title}`;
    case "LEGAL_MILESTONE":
      return `Legal milestone tracking: ${title}`;
    case "COALITION":
      return `Local coalition activity: ${title}`;
    case "PETITION_OTHER":
      return `Petition/ballot objective: ${title}`;
    default:
      return "Not a petition/ballot objective.";
  }
}

function deriveValidationRisk(input: {
  activitiesAtRisk: number;
  fieldHeat?: FieldOperationsHome["executiveFeed"] | null;
  volunteer?: VolunteerOperationsHome["executiveFeed"] | null;
  petitionCount: number;
}): PetitionBallotOperationsHome["validationRisk"] {
  if (input.petitionCount === 0) return "UNKNOWN";
  if (input.activitiesAtRisk > 2 || (input.fieldHeat?.blockedMissions ?? 0) > 0) {
    return "CRITICAL";
  }
  if (
    input.activitiesAtRisk > 0 ||
    (input.volunteer?.criticalVacancies ?? 0) > 0 ||
    (input.fieldHeat?.teamsNeedingAttention ?? 0) > 0
  ) {
    return "HIGH";
  }
  return "WATCH";
}

export function buildPetitionBallotOperationsHome(input: {
  brief: CampaignBrief;
  missions: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  counties: CountyOperationsHome;
  volunteers: VolunteerOperationsHome;
  communications: CommunicationsOperationsHome;
  logistics: LogisticsOperationsHome;
  compliance: ComplianceOperationsHome;
  field: FieldOperationsHome;
  now?: Date;
}): PetitionBallotOperationsHome {
  const now = input.now ?? new Date();
  const volunteerById = new Map(
    input.volunteers.fieldFeed.missions.map((m) => [m.missionId, m]),
  );
  const logisticsById = new Map(
    input.logistics.missionRows.map((m) => [m.missionId, m]),
  );
  const commsById = new Map(
    input.communications.missionRows.map((m) => [m.missionId, m]),
  );
  const complianceById = new Map(
    input.compliance.missionRows.map((m) => [m.missionId, m]),
  );

  const activityRows: PetitionActivityRow[] = input.missions.map((mission) => {
    const kind = classifyPetitionActivity({ title: mission.title });
    const countyName =
      input.countiesByMission.find((c) => c.missionId === mission.missionId)
        ?.countyName ?? null;
    const domains = buildActivityDomains({
      mission,
      kind,
      countyName,
      volunteer: volunteerById.get(mission.missionId),
      logistics: logisticsById.get(mission.missionId),
      communications: commsById.get(mission.missionId),
      compliance: complianceById.get(mission.missionId),
      countyFeed: input.counties.executiveFeed,
    });
    const deploymentReadiness = combineOperationalReadiness(
      domains.map((d) => d.state),
    );

    return {
      missionId: mission.missionId,
      missionTitle: mission.title,
      whenLabel: mission.whenLabel,
      href: `/calendar?event=${mission.missionId}`,
      kind,
      countyName,
      domains,
      deploymentReadiness,
      objectives: objectivesFor(kind, mission.title),
    };
  });

  const petitionRows = activityRows.filter((r) => r.kind !== "NOT_PETITION");
  const readinessDomains = dayDomains(activityRows);
  const petitionReadiness =
    petitionRows.length === 0
      ? ("NOT_REQUIRED" as DomainReadiness)
      : combineOperationalReadiness(readinessDomains.map((d) => d.state));

  const activitiesAtRisk = petitionRows.filter(
    (r) =>
      r.deploymentReadiness === "BLOCKED" ||
      r.deploymentReadiness === "NEEDS_ATTENTION" ||
      r.deploymentReadiness === "UNKNOWN",
  ).length;

  const countyMap = new Map<string, PetitionActivityRow[]>();
  for (const row of petitionRows) {
    const key = row.countyName ?? "Unknown";
    const list = countyMap.get(key) ?? [];
    list.push(row);
    countyMap.set(key, list);
  }

  const countySignals: PetitionCountySignal[] = [...countyMap.entries()].map(
    ([countyName, rows]) => {
      const deploymentReadiness = combineOperationalReadiness(
        rows.map((r) => r.deploymentReadiness),
      );
      const coverage = combineOperationalReadiness(
        rows.map(
          (r) =>
            r.domains.find((d) => d.domain === "CountyCoverage")?.state ??
            "NOT_REQUIRED",
        ),
      );
      const coalition = combineOperationalReadiness(
        rows
          .filter((r) => r.kind === "COALITION" || r.kind === "PETITION_OTHER")
          .map((r) => r.deploymentReadiness),
      );
      return {
        countyName,
        slug: countySlug(countyName),
        collectionReadiness: coverage,
        volunteerDeployment: deploymentReadiness,
        signatureCoverageGoal: COVERAGE_GOAL_UNKNOWN,
        localCoalitionActivity:
          rows.some((r) => r.kind === "COALITION")
            ? coalition
            : ("UNKNOWN" as DomainReadiness),
        activityCount: rows.length,
      };
    },
  );

  const countyCoverage =
    petitionRows.length === 0
      ? ("NOT_REQUIRED" as DomainReadiness)
      : combineOperationalReadiness(
          readinessDomains
            .filter((d) => d.domain === "CountyCoverage")
            .map((d) => d.state),
        );

  const educationReadiness =
    petitionRows.length === 0
      ? ("NOT_REQUIRED" as DomainReadiness)
      : combineOperationalReadiness(
          readinessDomains
            .filter((d) => d.domain === "EducationMessaging")
            .map((d) => d.state),
        );

  const validationRisk = deriveValidationRisk({
    activitiesAtRisk,
    fieldHeat: input.field.executiveFeed,
    volunteer: input.volunteers.executiveFeed,
    petitionCount: petitionRows.length,
  });

  const collectionProgress: KnownOrUnknown = {
    status: "unknown",
    value: null,
    reason: SIGNATURES_UNKNOWN.reason,
  };

  const driveCount = petitionRows.filter(
    (r) =>
      r.kind === "SIGNATURE_DRIVE" ||
      r.kind === "CIRCULATOR_DEPLOYMENT" ||
      r.kind === "CIRCULATOR_TRAINING",
  ).length;
  const educationCount = petitionRows.filter(
    (r) => r.kind === "BALLOT_EDUCATION",
  ).length;
  const staffingKnown = petitionRows.filter((r) =>
    ["SIGNATURE_DRIVE", "CIRCULATOR_DEPLOYMENT", "COALITION"].includes(r.kind),
  ).length;

  const unknowns = [
    { fact: "Petition signatures (raw)", reason: SIGNATURES_UNKNOWN.reason },
    {
      fact: "Official validation results",
      reason: OFFICIAL_VALIDATION_UNKNOWN.reason,
    },
    { fact: "Voter registration / voter file", reason: VOTER_FILE_UNKNOWN.reason },
    { fact: "Election schedules", reason: ELECTION_SCHEDULE_UNKNOWN.reason },
    {
      fact: "County election records",
      reason: COUNTY_ELECTION_RECORDS_UNKNOWN.reason,
    },
    { fact: "Legal milestone registry", reason: LEGAL_MILESTONES_UNKNOWN.reason },
    {
      fact: "Circulator training completion",
      reason: TRAINING_UNKNOWN.reason,
    },
    {
      fact: "Numeric signature coverage goals",
      reason: COVERAGE_GOAL_UNKNOWN.reason,
    },
  ];

  const briefingLine =
    petitionRows.length === 0
      ? "Petition & Ballot Ops: no petition/ballot activities classified today — qualification workflow not required."
      : `Petition readiness ${petitionReadiness}` +
        (activitiesAtRisk > 0
          ? ` · ${activitiesAtRisk} activity(ies) at risk`
          : "") +
        ` · ${petitionRows.length} petition/ballot activity(ies) today. Collection progress and official validation remain Unknown.`;

  const signatureDriveObjectives = petitionRows
    .filter(
      (r) =>
        r.kind === "SIGNATURE_DRIVE" ||
        r.kind === "CIRCULATOR_DEPLOYMENT" ||
        r.kind === "PETITION_OTHER",
    )
    .map((r) => r.objectives);

  const mediaOpportunities = petitionRows
    .filter((r) => r.kind === "BALLOT_EDUCATION" || r.kind === "COALITION")
    .map((r) => r.missionTitle);

  return {
    title: "PETITION & BALLOT OPERATIONS",
    date: input.brief.date,
    timezone: input.brief.timezone,
    lastUpdatedAt: now.toISOString(),
    doctrine:
      "coordinates campaign strategy — operational systems provide execution truth",
    petitionReadiness,
    collectionProgress,
    countyCoverage,
    validationRisk,
    legalMilestones: LEGAL_MILESTONES_UNKNOWN,
    educationReadiness,
    activityRows,
    readinessDomains,
    countySignals,
    unknowns,
    candidateFeed: {
      petitionCampaignStops: petitionRows.length,
      publicEducationEvents: educationCount,
      mediaOpportunities,
      signatureDriveObjectives,
      preparationStatus: petitionReadiness,
      briefingLine,
    },
    countyFeed: countySignals,
    volunteerFeed: {
      circulatorAssignments:
        driveCount > 0
          ? { status: "known", value: driveCount }
          : {
              status: "unknown",
              value: null,
              reason:
                "No circulator/signature-drive activities classified today — Unknown, not zero.",
            },
      trainingCompletion: TRAINING_UNKNOWN,
      eventStaffing:
        staffingKnown > 0
          ? { status: "known", value: staffingKnown }
          : {
              status: "unknown",
              value: null,
              reason:
                "No petition event staffing missions classified today — Unknown, not zero.",
            },
      countyDeployment: countySignals.length,
      briefingLine:
        petitionRows.length === 0
          ? "No petition circulator assignments for Volunteer Ops today."
          : `${driveCount || petitionRows.length} petition deployment mission(s). Training completion Unknown.`,
    },
    communicationsFeed: {
      educationalCampaignsStatus: "unknown",
      messagingPackagesStatus: "unknown",
      faqReadinessStatus: "unknown",
      publicOutreachTimingStatus: "unknown",
      petitionActivityCount: petitionRows.length,
      briefingLine:
        petitionRows.length === 0
          ? "No petition/ballot activities for messaging coordination today."
          : `Educational campaigns / FAQ / outreach timing Unknown across ${petitionRows.length} petition activity(ies).`,
    },
    intelligenceFeed: {
      countyCollectionTrendsStatus: "unknown",
      deploymentEffectivenessStatus: "unknown",
      validationRisk,
      geographicCoverageGapsSignal:
        countySignals.some((c) => c.collectionReadiness === "BLOCKED") ||
        countySignals.length > 0 &&
          countySignals.every(
            (c) =>
              c.collectionReadiness === "UNKNOWN" ||
              c.collectionReadiness === "NEEDS_ATTENTION",
          ),
      executionBottlenecks: activitiesAtRisk,
      briefingLine:
        activitiesAtRisk > 0
          ? `${activitiesAtRisk} petition execution bottleneck(s). Collection trends Unknown; validation risk ${validationRisk}.`
          : `No petition bottlenecks from today’s prep signals. Collection trends Unknown; validation risk ${validationRisk}.`,
    },
    executiveFeed: {
      petitionReadiness,
      collectionProgressStatus: "unknown",
      collectionProgressValue: null,
      countyCoverage,
      validationRisk,
      legalMilestonesStatus: "unknown",
      educationReadiness,
      activitiesAtRisk,
      briefingLine,
    },
  };
}

export function petitionBallotOperationsForAdvisory(
  home: PetitionBallotOperationsHome,
) {
  return {
    date: home.date,
    petitionReadiness: home.petitionReadiness,
    collectionProgressStatus: home.collectionProgress.status,
    countyCoverage: home.countyCoverage,
    validationRisk: home.validationRisk,
    educationReadiness: home.educationReadiness,
    activitiesAtRisk: home.executiveFeed.activitiesAtRisk,
    domains: home.readinessDomains.map((d) => ({
      domain: d.domain,
      state: d.state,
    })),
    unknowns: home.unknowns.map((u) => u.fact),
    doctrine: home.doctrine,
    executiveFeed: home.executiveFeed,
    candidateFeed: home.candidateFeed,
  };
}
