import "server-only";

import { prisma } from "@/server/db/prisma";
import { ORG_CAMPAIGN_SCOPE } from "@/lib/organization/template";
import {
  VOLUNTEER_INTEREST_TAXONOMY,
  VOLUNTEER_TRAINING_CATALOG,
} from "@/lib/volunteers/taxonomy";

export async function countVolunteerOps() {
  const [profiles, interests, availability, assignments, workIndex] =
    await Promise.all([
      prisma.campaignVolunteerProfile.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
      prisma.campaignVolunteerInterest.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
      prisma.campaignVolunteerAvailability.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
      prisma.campaignVolunteerAssignment.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
      prisma.campaignWorkItemIndex.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
    ]);
  return { profiles, interests, availability, assignments, workIndex };
}

export async function createVolunteerProfile(input: {
  localPersonId: string;
  preferredDisplayName: string;
  actorUserId?: string | null;
  autoMatchByName?: boolean;
  lifecycleStatus?: "PROSPECT" | "INTAKE_NEEDED" | "ONBOARDING" | "READY";
}) {
  if (input.autoMatchByName === true) {
    throw new Error("Name-only person linking is blocked.");
  }
  const person = await prisma.person.findUnique({
    where: { id: input.localPersonId },
  });
  if (!person) {
    throw new Error("Local person not found — select an approved identity.");
  }

  const existing = await prisma.campaignVolunteerProfile.findUnique({
    where: {
      campaignScopeKey_localPersonId: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        localPersonId: input.localPersonId,
      },
    },
  });
  if (existing) return { profile: existing, created: false };

  const status = input.lifecycleStatus ?? "PROSPECT";
  const profile = await prisma.campaignVolunteerProfile.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      localPersonId: input.localPersonId,
      preferredDisplayName: input.preferredDisplayName,
      lifecycleStatus: status,
      createdByUserId: input.actorUserId ?? null,
    },
  });
  await prisma.campaignVolunteerStatusHistory.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      profileId: profile.id,
      fromStatus: null,
      toStatus: status,
      reason: "Intentional profile creation",
      actorUserId: input.actorUserId ?? null,
    },
  });
  return { profile, created: true };
}

export async function addVolunteerInterest(input: {
  profileId: string;
  interestKey: string;
}) {
  const tax = VOLUNTEER_INTEREST_TAXONOMY.find((t) => t.key === input.interestKey);
  if (!tax) throw new Error("Interest must be from approved taxonomy.");
  const existing = await prisma.campaignVolunteerInterest.findUnique({
    where: {
      profileId_interestKey: {
        profileId: input.profileId,
        interestKey: input.interestKey,
      },
    },
  });
  if (existing) return { interest: existing, created: false };
  const interest = await prisma.campaignVolunteerInterest.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      profileId: input.profileId,
      interestKey: tax.key,
      label: tax.label,
    },
  });
  return { interest, created: true };
}

export async function addVolunteerAvailability(input: {
  profileId: string;
  kind?: string;
  weekday?: number | null;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  remoteOk?: boolean;
  inPersonOk?: boolean;
  idempotencyNote?: string;
}) {
  // Availability never assigns anyone.
  const row = await prisma.campaignVolunteerAvailability.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      profileId: input.profileId,
      kind: input.kind ?? "RECURRING",
      weekday: input.weekday ?? null,
      startLocalTime: input.startLocalTime ?? null,
      endLocalTime: input.endLocalTime ?? null,
      remoteOk: input.remoteOk ?? true,
      inPersonOk: input.inPersonOk ?? true,
      maxFrequencyNote: input.idempotencyNote ?? null,
    },
  });
  return { availability: row, assigns: false };
}

export async function proposeVolunteerAssignment(input: {
  profileId: string;
  opportunityTitle: string;
  whyItMatters?: string;
  definitionOfDone?: string;
  missionId?: string | null;
  activationVolunteerNeedId?: string | null;
  departmentKey?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  supervisorLabel?: string | null;
  actorUserId?: string | null;
  idempotencyKey: string;
  autoAssign?: boolean;
}) {
  if (input.autoAssign === true) {
    throw new Error("Automatic assignment is blocked — placement is human-reviewed.");
  }
  const existing = await prisma.campaignVolunteerAssignment.findUnique({
    where: {
      campaignScopeKey_idempotencyKey: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) return { assignment: existing, created: false };

  const assignment = await prisma.campaignVolunteerAssignment.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      profileId: input.profileId,
      status: "PROPOSED",
      opportunityTitle: input.opportunityTitle,
      whyItMatters: input.whyItMatters ?? null,
      definitionOfDone: input.definitionOfDone ?? null,
      missionId: input.missionId ?? null,
      activationVolunteerNeedId: input.activationVolunteerNeedId ?? null,
      departmentKey: input.departmentKey ?? "VOLUNTEER_AND_ORGANIZING",
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      supervisorLabel: input.supervisorLabel ?? null,
      proposedByUserId: input.actorUserId ?? null,
      idempotencyKey: input.idempotencyKey,
    },
  });

  if (input.activationVolunteerNeedId) {
    await prisma.missionActivationVolunteerNeed.update({
      where: { id: input.activationVolunteerNeedId },
      data: { status: "PROPOSED" },
    });
  }

  return { assignment, created: true, grantsAttendance: false, grantsConsent: false };
}

export async function confirmVolunteerAssignment(input: {
  assignmentId: string;
  actorUserId?: string | null;
}) {
  const assignment = await prisma.campaignVolunteerAssignment.update({
    where: { id: input.assignmentId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      confirmedByUserId: input.actorUserId ?? null,
    },
  });
  if (assignment.activationVolunteerNeedId) {
    await prisma.missionActivationVolunteerNeed.update({
      where: { id: assignment.activationVolunteerNeedId },
      data: {
        status: "CONFIRMED",
        assignedPersonId: (
          await prisma.campaignVolunteerProfile.findUnique({
            where: { id: assignment.profileId },
            select: { localPersonId: true },
          })
        )?.localPersonId,
      },
    });
  }
  await prisma.campaignVolunteerProfile.update({
    where: { id: assignment.profileId },
    data: {
      lifecycleStatus: "ACTIVE",
      lastMeaningfulActionAt: new Date(),
    },
  });
  return {
    assignment,
    isCheckIn: false,
    isMissionExecution: false,
    inferredConsent: false,
  };
}

export async function listVolunteerProfiles() {
  return prisma.campaignVolunteerProfile.findMany({
    where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE, archivedAt: null },
    include: {
      interests: true,
      availability: true,
      assignments: {
        where: { status: { in: ["PROPOSED", "CONFIRMED", "ASSIGNED", "CHECKED_IN"] } },
        orderBy: { startsAt: "asc" },
        take: 10,
      },
    },
    orderBy: { preferredDisplayName: "asc" },
    take: 200,
  });
}

export async function listOpenVolunteerNeeds() {
  return prisma.missionActivationVolunteerNeed.findMany({
    where: { status: { in: ["OPEN", "PROPOSED"] } },
    include: {
      plan: { select: { missionId: true, id: true } },
      task: { select: { id: true, title: true, dueAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listVolunteerAssignmentsForCalendar(profileId?: string) {
  return prisma.campaignVolunteerAssignment.findMany({
    where: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      status: { in: ["PROPOSED", "INVITED", "ASSIGNED", "CONFIRMED", "CHECKED_IN"] },
      ...(profileId ? { profileId } : {}),
    },
    include: {
      profile: { select: { preferredDisplayName: true, id: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
}

export async function ensureTrainingCatalog() {
  for (const [i, t] of VOLUNTEER_TRAINING_CATALOG.entries()) {
    await prisma.campaignTrainingCatalogItem.upsert({
      where: {
        campaignScopeKey_trainingKey: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          trainingKey: t.key,
        },
      },
      create: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        trainingKey: t.key,
        title: t.title,
        sortOrder: i,
      },
      update: { title: t.title, sortOrder: i },
    });
  }
}

export async function deleteVolunteerProofRecords(profileId: string) {
  await prisma.campaignVolunteerAssignment.deleteMany({ where: { profileId } });
  await prisma.campaignVolunteerInterest.deleteMany({ where: { profileId } });
  await prisma.campaignVolunteerAvailability.deleteMany({ where: { profileId } });
  await prisma.campaignVolunteerStatusHistory.deleteMany({ where: { profileId } });
  await prisma.campaignVolunteerProfile.delete({ where: { id: profileId } });
}

export async function findAcmPosition() {
  return prisma.campaignOrgPosition.findUnique({
    where: {
      campaignScopeKey_key: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        key: "ASSISTANT_CAMPAIGN_MANAGER",
      },
    },
  });
}

export async function findLogisticsLeadPosition() {
  return prisma.campaignOrgPosition.findUnique({
    where: {
      campaignScopeKey_key: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        key: "CAMPAIGN_LOGISTICS_LEAD",
      },
    },
  });
}
