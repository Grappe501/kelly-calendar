import "server-only";
import { prisma } from "@/server/db/prisma";
import type {
  CampaignCommChannel,
  CampaignCommPurpose,
  CampaignCommSuppressionReason,
  CampaignCommConsentEvidenceType,
} from "@/lib/missions/v21/communications/types";

export async function findActiveCommunicationPolicy(campaignScopeKey = "KELLY") {
  return prisma.campaignCommunicationPolicy.findFirst({
    where: { campaignScopeKey, isActive: true },
    orderBy: { version: "desc" },
  });
}

export async function createCommunicationPolicy(data: {
  campaignScopeKey: string;
  version: number;
  policyFingerprint: string;
  allowedChannels: string[];
  allowedPurposes: string[];
  acceptedEvidenceByChannelPurpose: object;
  allowOperatorAttestation: boolean;
  requireVerifiedContact: boolean;
  sharedContactMode: string;
  externalDispatchEnabled: boolean;
  exportEnabled: boolean;
  handoffEnabled: boolean;
  approvalExpiresHours: number | null;
  actorUserId: string;
  notes?: string | null;
}) {
  return prisma.campaignCommunicationPolicy.create({
    data: {
      campaignScopeKey: data.campaignScopeKey,
      version: data.version,
      policyFingerprint: data.policyFingerprint,
      allowedChannels: data.allowedChannels,
      allowedPurposes: data.allowedPurposes,
      acceptedEvidenceByChannelPurpose: data.acceptedEvidenceByChannelPurpose,
      allowOperatorAttestation: data.allowOperatorAttestation,
      requireVerifiedContact: data.requireVerifiedContact,
      sharedContactMode: data.sharedContactMode,
      externalDispatchEnabled: data.externalDispatchEnabled,
      exportEnabled: data.exportEnabled,
      handoffEnabled: data.handoffEnabled,
      approvalExpiresHours: data.approvalExpiresHours,
      notes: data.notes ?? null,
      createdByUserId: data.actorUserId,
      updatedByUserId: data.actorUserId,
    },
  });
}

export async function listCommunications(limit = 50) {
  return prisma.campaignCommunication.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: {
      audienceMembers: { select: { eligibilityState: true, inclusionState: true } },
      approvals: {
        where: { isInvalidated: false },
        orderBy: { approvedAt: "desc" },
      },
      queueItems: { select: { status: true } },
    },
  });
}

export async function findCommunicationById(id: string) {
  return prisma.campaignCommunication.findUnique({
    where: { id },
    include: {
      audienceMembers: { orderBy: { createdAt: "asc" } },
      approvals: { orderBy: { approvedAt: "desc" } },
      queueItems: {
        orderBy: { preparedAt: "asc" },
        include: { deliveryEvents: true },
      },
      mission: {
        select: {
          id: true,
          attendTitle: true,
          startsAt: true,
          endsAt: true,
          sourceEventId: true,
        },
      },
    },
  });
}

export async function createCommunication(data: {
  title: string;
  purpose: CampaignCommPurpose;
  channel: CampaignCommChannel;
  campaignDateKey?: string | null;
  missionId?: string | null;
  eventId?: string | null;
  staffingPlanId?: string | null;
  staffingRequirementId?: string | null;
  subject?: string | null;
  bodyText?: string | null;
  mobilizeEventUrl?: string | null;
  mobilizeEventReferenceId?: string | null;
  policyVersion?: number | null;
  policyFingerprint?: string | null;
  actorUserId: string;
}) {
  return prisma.campaignCommunication.create({
    data: {
      title: data.title,
      purpose: data.purpose,
      channel: data.channel,
      campaignDateKey: data.campaignDateKey ?? null,
      missionId: data.missionId ?? null,
      eventId: data.eventId ?? null,
      staffingPlanId: data.staffingPlanId ?? null,
      staffingRequirementId: data.staffingRequirementId ?? null,
      subject: data.subject ?? null,
      bodyText: data.bodyText ?? null,
      mobilizeEventUrl: data.mobilizeEventUrl ?? null,
      mobilizeEventReferenceId: data.mobilizeEventReferenceId ?? null,
      policyVersion: data.policyVersion ?? null,
      policyFingerprint: data.policyFingerprint ?? null,
      status: "DRAFT",
      createdByUserId: data.actorUserId,
      updatedByUserId: data.actorUserId,
    },
  });
}

export async function updateCommunication(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.campaignCommunication.update({
    where: { id },
    data: data as never,
  });
}

export async function upsertContactPoint(data: {
  channel: CampaignCommChannel;
  normalizedDestination: string;
  maskedDisplay: string;
  verificationState?: "UNVERIFIED" | "OPERATOR_VERIFIED" | "PROVIDER_VERIFIED" | "INVALID";
  localPersonId?: string | null;
  campaignUserId?: string | null;
  confirmedExternalPersonId?: string | null;
  actorUserId: string;
}) {
  return prisma.campaignContactPoint.upsert({
    where: {
      campaignScopeKey_channel_normalizedDestination: {
        campaignScopeKey: "KELLY",
        channel: data.channel,
        normalizedDestination: data.normalizedDestination,
      },
    },
    create: {
      channel: data.channel,
      normalizedDestination: data.normalizedDestination,
      maskedDisplay: data.maskedDisplay,
      verificationState: data.verificationState ?? "UNVERIFIED",
      localPersonId: data.localPersonId ?? null,
      campaignUserId: data.campaignUserId ?? null,
      confirmedExternalPersonId: data.confirmedExternalPersonId ?? null,
      firstObservedAt: new Date(),
      lastObservedAt: new Date(),
      createdByUserId: data.actorUserId,
      updatedByUserId: data.actorUserId,
    },
    update: {
      maskedDisplay: data.maskedDisplay,
      verificationState: data.verificationState,
      localPersonId: data.localPersonId ?? undefined,
      campaignUserId: data.campaignUserId ?? undefined,
      confirmedExternalPersonId: data.confirmedExternalPersonId ?? undefined,
      lastObservedAt: new Date(),
      updatedByUserId: data.actorUserId,
      isActive: true,
    },
  });
}

export async function createConsentEvidence(data: {
  contactPointId: string;
  channel: CampaignCommChannel;
  purpose: CampaignCommPurpose;
  evidenceType: CampaignCommConsentEvidenceType;
  source: string;
  sourceReference?: string | null;
  capturedAt: Date;
  effectiveFrom: Date;
  expiresAt?: Date | null;
  evidenceNote?: string | null;
  actorUserId: string;
}) {
  return prisma.campaignCommunicationConsentEvidence.create({
    data: {
      contactPointId: data.contactPointId,
      channel: data.channel,
      purpose: data.purpose,
      evidenceType: data.evidenceType,
      source: data.source,
      sourceReference: data.sourceReference ?? null,
      capturedAt: data.capturedAt,
      effectiveFrom: data.effectiveFrom,
      expiresAt: data.expiresAt ?? null,
      evidenceNote: data.evidenceNote ?? null,
      recordedByUserId: data.actorUserId,
    },
  });
}

export async function listConsentForContact(contactPointId: string) {
  return prisma.campaignCommunicationConsentEvidence.findMany({
    where: { contactPointId, state: "ACTIVE" },
  });
}

export async function createSuppression(data: {
  contactPointId?: string | null;
  localPersonId?: string | null;
  campaignUserId?: string | null;
  channel?: CampaignCommChannel | null;
  allChannels?: boolean;
  purpose?: CampaignCommPurpose | null;
  reason: CampaignCommSuppressionReason;
  source: string;
  effectiveAt: Date;
  expiresAt?: Date | null;
  actorUserId: string;
}) {
  return prisma.campaignCommunicationSuppression.create({
    data: {
      contactPointId: data.contactPointId ?? null,
      localPersonId: data.localPersonId ?? null,
      campaignUserId: data.campaignUserId ?? null,
      channel: data.channel ?? null,
      allChannels: data.allChannels ?? false,
      purpose: data.purpose ?? null,
      reason: data.reason,
      source: data.source,
      effectiveAt: data.effectiveAt,
      expiresAt: data.expiresAt ?? null,
      recordedByUserId: data.actorUserId,
    },
  });
}

export async function revokeSuppression(
  id: string,
  actorUserId: string,
  reason: string,
) {
  return prisma.campaignCommunicationSuppression.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedByUserId: actorUserId,
      revocationReason: reason,
    },
  });
}

export async function listActiveSuppressions(options?: {
  contactPointId?: string;
  localPersonId?: string;
  campaignUserId?: string;
}) {
  return prisma.campaignCommunicationSuppression.findMany({
    where: {
      isActive: true,
      OR: [
        options?.contactPointId
          ? { contactPointId: options.contactPointId }
          : undefined,
        options?.localPersonId
          ? { localPersonId: options.localPersonId }
          : undefined,
        options?.campaignUserId
          ? { campaignUserId: options.campaignUserId }
          : undefined,
      ].filter(Boolean) as never[],
    },
  });
}

export async function listAllActiveSuppressions(limit = 100) {
  return prisma.campaignCommunicationSuppression.findMany({
    where: { isActive: true },
    orderBy: { effectiveAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

export async function replaceAudienceMembers(
  communicationId: string,
  members: Array<{
    contactPointId?: string | null;
    localPersonId?: string | null;
    campaignUserId?: string | null;
    confirmedExternalPersonId?: string | null;
    manualDisplayLabel?: string | null;
    candidateSource: string;
    eligibilityState: string;
    inclusionState: string;
    eligibilityReasonCodes: string[];
    warningReasonCodes: string[];
    consentEvidenceIds: string[];
    suppressionIds: string[];
    eligibilityFingerprint: string;
  }>,
) {
  await prisma.campaignCommunicationAudienceMember.deleteMany({
    where: { communicationId },
  });
  if (!members.length) return [];
  await prisma.campaignCommunicationAudienceMember.createMany({
    data: members.map((m) => ({
      communicationId,
      contactPointId: m.contactPointId ?? null,
      localPersonId: m.localPersonId ?? null,
      campaignUserId: m.campaignUserId ?? null,
      confirmedExternalPersonId: m.confirmedExternalPersonId ?? null,
      manualDisplayLabel: m.manualDisplayLabel ?? null,
      candidateSource: m.candidateSource,
      eligibilityState: m.eligibilityState as never,
      inclusionState: m.inclusionState as never,
      eligibilityReasonCodes: m.eligibilityReasonCodes,
      warningReasonCodes: m.warningReasonCodes,
      consentEvidenceIds: m.consentEvidenceIds,
      suppressionIds: m.suppressionIds,
      eligibilityFingerprint: m.eligibilityFingerprint,
    })),
  });
  return prisma.campaignCommunicationAudienceMember.findMany({
    where: { communicationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateAudienceMember(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.campaignCommunicationAudienceMember.update({
    where: { id },
    data: data as never,
  });
}

export async function createApproval(data: {
  communicationId: string;
  approvalType: "CONTENT" | "AUDIENCE" | "DISPATCH";
  contentFingerprint?: string | null;
  audienceFingerprint?: string | null;
  policyVersion?: number | null;
  policyFingerprint?: string | null;
  approvedByUserId: string;
  expiresAt?: Date | null;
  reason?: string | null;
}) {
  return prisma.campaignCommunicationApproval.create({
    data: {
      communicationId: data.communicationId,
      approvalType: data.approvalType,
      contentFingerprint: data.contentFingerprint ?? null,
      audienceFingerprint: data.audienceFingerprint ?? null,
      policyVersion: data.policyVersion ?? null,
      policyFingerprint: data.policyFingerprint ?? null,
      approvedByUserId: data.approvedByUserId,
      expiresAt: data.expiresAt ?? null,
      reason: data.reason ?? null,
    },
  });
}

export async function invalidateApprovals(
  communicationId: string,
  types: Array<"CONTENT" | "AUDIENCE" | "DISPATCH">,
  reason: string,
) {
  return prisma.campaignCommunicationApproval.updateMany({
    where: {
      communicationId,
      approvalType: { in: types },
      isInvalidated: false,
    },
    data: {
      isInvalidated: true,
      invalidatedAt: new Date(),
      invalidationReason: reason,
    },
  });
}

export async function upsertQueueItem(data: {
  communicationId: string;
  audienceMemberId: string;
  contactPointId?: string | null;
  channel: CampaignCommChannel;
  destinationRef?: string | null;
  status: string;
  contentFingerprint: string;
  audienceFingerprint: string;
  idempotencyKey: string;
  blockReasonCodes?: string[];
  actorUserId: string;
}) {
  return prisma.campaignCommunicationQueueItem.upsert({
    where: { idempotencyKey: data.idempotencyKey },
    create: {
      communicationId: data.communicationId,
      audienceMemberId: data.audienceMemberId,
      contactPointId: data.contactPointId ?? null,
      channel: data.channel,
      destinationRef: data.destinationRef ?? null,
      status: data.status as never,
      contentFingerprint: data.contentFingerprint,
      audienceFingerprint: data.audienceFingerprint,
      idempotencyKey: data.idempotencyKey,
      blockReasonCodes: data.blockReasonCodes ?? [],
      createdByUserId: data.actorUserId,
      updatedByUserId: data.actorUserId,
    },
    update: {
      status: data.status as never,
      blockReasonCodes: data.blockReasonCodes ?? [],
      updatedByUserId: data.actorUserId,
    },
  });
}

export async function updateQueueItem(
  id: string,
  data: Record<string, unknown>,
) {
  return prisma.campaignCommunicationQueueItem.update({
    where: { id },
    data: data as never,
  });
}

export async function findContactPointById(id: string) {
  return prisma.campaignContactPoint.findUnique({ where: { id } });
}

export async function countCommunicationsRecords() {
  const [
    policies,
    contacts,
    evidence,
    suppressions,
    communications,
    audience,
    approvals,
    queue,
    delivery,
  ] = await Promise.all([
    prisma.campaignCommunicationPolicy.count(),
    prisma.campaignContactPoint.count(),
    prisma.campaignCommunicationConsentEvidence.count(),
    prisma.campaignCommunicationSuppression.count(),
    prisma.campaignCommunication.count(),
    prisma.campaignCommunicationAudienceMember.count(),
    prisma.campaignCommunicationApproval.count(),
    prisma.campaignCommunicationQueueItem.count(),
    prisma.campaignCommunicationDeliveryEvent.count(),
  ]);
  return {
    policies,
    contacts,
    evidence,
    suppressions,
    communications,
    audience,
    approvals,
    queue,
    delivery,
  };
}
