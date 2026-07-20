import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
  assertCommunicationsIsolation,
  audienceFingerprint,
  buildDefaultCommunicationPolicy,
  contentFingerprint,
  evaluateCommunicationEligibility,
  getDefaultCommunicationProviderAdapter,
  maskDestination,
  normalizeEmail,
  normalizePhone,
  queueIdempotencyKey,
  renderContentPreview,
  sanitizeExportCell,
  type CampaignCommChannel,
  type CampaignCommPurpose,
  type CampaignCommSuppressionReason,
  type CampaignCommConsentEvidenceType,
  type CommunicationPolicySnapshot,
  type ConsentEvidenceInput,
  type SuppressionInput,
} from "@/lib/missions/v21/communications";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { prisma } from "@/server/db/prisma";
import {
  createApproval,
  createCommunication,
  createConsentEvidence,
  createSuppression,
  createCommunicationPolicy,
  findActiveCommunicationPolicy,
  findCommunicationById,
  findContactPointById,
  invalidateApprovals,
  listAllActiveSuppressions,
  listCommunications,
  listConsentForContact,
  replaceAudienceMembers,
  revokeSuppression,
  updateAudienceMember,
  updateCommunication,
  updateQueueItem,
  upsertContactPoint,
  upsertQueueItem,
} from "@/server/repositories/campaign-communications-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Campaign Communications requires campaign leadership access.",
    );
  }
}

function policyFromRow(
  row: NonNullable<Awaited<ReturnType<typeof findActiveCommunicationPolicy>>>,
): CommunicationPolicySnapshot {
  return {
    version: row.version,
    policyFingerprint: row.policyFingerprint,
    allowedChannels: row.allowedChannels as CampaignCommChannel[],
    allowedPurposes: row.allowedPurposes as CampaignCommPurpose[],
    acceptedEvidenceByChannelPurpose:
      (row.acceptedEvidenceByChannelPurpose as CommunicationPolicySnapshot["acceptedEvidenceByChannelPurpose"]) ??
      {},
    allowOperatorAttestation: row.allowOperatorAttestation,
    requireVerifiedContact: row.requireVerifiedContact,
    sharedContactMode: row.sharedContactMode as CommunicationPolicySnapshot["sharedContactMode"],
    requireSeparateAudienceAndContentApproval:
      row.requireSeparateAudienceAndContentApproval,
    approvalExpiresHours: row.approvalExpiresHours,
    externalDispatchEnabled: row.externalDispatchEnabled,
    exportEnabled: row.exportEnabled,
    handoffEnabled: row.handoffEnabled,
  };
}

/** Read path — never creates policy or communications. */
export async function getCommunicationPolicyView(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const row = await findActiveCommunicationPolicy();
  const defaults = buildDefaultCommunicationPolicy();
  const provider = getDefaultCommunicationProviderAdapter();
  return {
    policy: row ? policyFromRow(row) : null,
    defaults,
    providerCapabilities: provider.listCapabilities(),
    externalDispatchEnabled: false,
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
    isolation: assertCommunicationsIsolation(),
  };
}

export async function ensureCommunicationPolicySeed(
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const existing = await findActiveCommunicationPolicy();
  if (existing) return policyFromRow(existing);
  const defaults = buildDefaultCommunicationPolicy();
  const created = await createCommunicationPolicy({
    campaignScopeKey: "KELLY",
    version: defaults.version,
    policyFingerprint: defaults.policyFingerprint,
    allowedChannels: defaults.allowedChannels,
    allowedPurposes: defaults.allowedPurposes,
    acceptedEvidenceByChannelPurpose: defaults.acceptedEvidenceByChannelPurpose,
    allowOperatorAttestation: defaults.allowOperatorAttestation,
    requireVerifiedContact: defaults.requireVerifiedContact,
    sharedContactMode: defaults.sharedContactMode,
    externalDispatchEnabled: false,
    exportEnabled: defaults.exportEnabled,
    handoffEnabled: defaults.handoffEnabled,
    approvalExpiresHours: defaults.approvalExpiresHours,
    actorUserId: actor.userId,
    notes: "Conservative D20 default policy — external dispatch disabled.",
  });
  await writeAttributedAudit({
    actor,
    action: "communications.policy.seed",
    entityType: "CampaignCommunicationPolicy",
    entityId: created.id,
    metadata: { version: created.version },
  });
  return policyFromRow(created);
}

async function resolvePolicy(
  actor: AuthenticatedActor,
): Promise<CommunicationPolicySnapshot> {
  const row = await findActiveCommunicationPolicy();
  if (row) return policyFromRow(row);
  return ensureCommunicationPolicySeed(actor);
}

function privacyListRow(
  row: Awaited<ReturnType<typeof listCommunications>>[number],
) {
  const eligibilityCounts: Record<string, number> = {};
  for (const m of row.audienceMembers) {
    eligibilityCounts[m.eligibilityState] =
      (eligibilityCounts[m.eligibilityState] ?? 0) + 1;
  }
  const audienceApproved = row.approvals.some(
    (a) => a.approvalType === "AUDIENCE" && !a.isInvalidated,
  );
  const contentApproved = row.approvals.some(
    (a) => a.approvalType === "CONTENT" && !a.isInvalidated,
  );
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    channel: row.channel,
    status: row.status,
    missionId: row.missionId,
    eventId: row.eventId,
    campaignDateKey: row.campaignDateKey,
    isStale: row.isStale,
    eligibilityCounts,
    audienceApproved,
    contentApproved,
    queueCount: row.queueItems.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCampaignCommunications(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const rows = await listCommunications();
  return {
    items: rows.map(privacyListRow),
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
    createdRecords: 0,
    isolation: assertCommunicationsIsolation(),
  };
}

function toConsentInputs(
  rows: Awaited<ReturnType<typeof listConsentForContact>>,
): ConsentEvidenceInput[] {
  return rows.map((e) => ({
    id: e.id,
    channel: e.channel,
    purpose: e.purpose,
    evidenceType: e.evidenceType,
    state: e.state,
    effectiveFrom: e.effectiveFrom.toISOString(),
    expiresAt: e.expiresAt?.toISOString() ?? null,
  }));
}

function toSuppressionInputs(
  rows: Awaited<ReturnType<typeof listAllActiveSuppressions>>,
): SuppressionInput[] {
  return rows.map((s) => ({
    id: s.id,
    channel: s.channel,
    allChannels: s.allChannels,
    purpose: s.purpose,
    reason: s.reason,
    isActive: s.isActive,
    effectiveAt: s.effectiveAt.toISOString(),
    expiresAt: s.expiresAt?.toISOString() ?? null,
  }));
}

export async function getCampaignCommunicationDetail(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const preview = renderContentPreview({
    channel: row.channel,
    subject: row.subject,
    bodyText: row.bodyText,
    mobilizeEventUrl: row.mobilizeEventUrl,
  });
  const provider = getDefaultCommunicationProviderAdapter();
  return {
    communication: {
      id: row.id,
      title: row.title,
      purpose: row.purpose,
      channel: row.channel,
      status: row.status,
      subject: row.subject,
      bodyText: row.bodyText,
      mobilizeEventUrl: row.mobilizeEventUrl,
      mobilizeEventReferenceId: row.mobilizeEventReferenceId,
      missionId: row.missionId,
      eventId: row.eventId,
      staffingPlanId: row.staffingPlanId,
      campaignDateKey: row.campaignDateKey,
      contentFingerprint: row.contentFingerprint,
      audienceFingerprint: row.audienceFingerprint,
      policyVersion: row.policyVersion,
      policyFingerprint: row.policyFingerprint,
      isStale: row.isStale,
      staleReason: row.staleReason,
      mission: row.mission
        ? {
            id: row.mission.id,
            title: row.mission.attendTitle,
            startsAt: row.mission.startsAt.toISOString(),
            endsAt: row.mission.endsAt.toISOString(),
            sourceEventId: row.mission.sourceEventId,
          }
        : null,
    },
    audience: row.audienceMembers.map((m) => ({
      id: m.id,
      candidateSource: m.candidateSource,
      eligibilityState: m.eligibilityState,
      inclusionState: m.inclusionState,
      eligibilityReasonCodes: m.eligibilityReasonCodes,
      warningReasonCodes: m.warningReasonCodes,
      maskedLabel:
        m.manualDisplayLabel ??
        (m.campaignUserId ? `User ${m.campaignUserId.slice(0, 6)}…` : null) ??
        (m.localPersonId ? `Person ${m.localPersonId.slice(0, 6)}…` : null) ??
        (m.confirmedExternalPersonId
          ? `External ${m.confirmedExternalPersonId.slice(0, 6)}…`
          : "Unlabeled"),
      // never expose destination
    })),
    approvals: row.approvals.map((a) => ({
      id: a.id,
      approvalType: a.approvalType,
      approvedAt: a.approvedAt.toISOString(),
      isInvalidated: a.isInvalidated,
      contentFingerprint: a.contentFingerprint,
      audienceFingerprint: a.audienceFingerprint,
    })),
    queue: row.queueItems.map((q) => ({
      id: q.id,
      status: q.status,
      blockReasonCodes: q.blockReasonCodes,
      preparedAt: q.preparedAt.toISOString(),
      exportedAt: q.exportedAt?.toISOString() ?? null,
      handedOffAt: q.handedOffAt?.toISOString() ?? null,
      handedOffToLabel: q.handedOffToLabel,
      deliveryEventCount: q.deliveryEvents.length,
      // never fabricate delivery
    })),
    contentPreview: preview,
    providerCapabilities: provider.listCapabilities(),
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
    isolation: assertCommunicationsIsolation(),
  };
}

export async function createCampaignCommunicationDraft(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) throw new ValidationError("title required.");
  const purpose = b.purpose as CampaignCommPurpose;
  const channel = b.channel as CampaignCommChannel;
  if (!purpose || !channel) {
    throw new ValidationError("purpose and channel required.");
  }
  const policy = await resolvePolicy(actor);
  if (!policy.allowedChannels.includes(channel)) {
    throw new ValidationError("Channel not allowed by campaign policy.");
  }
  if (!policy.allowedPurposes.includes(purpose)) {
    throw new ValidationError("Purpose not allowed by campaign policy.");
  }

  let missionId: string | null =
    typeof b.missionId === "string" ? b.missionId : null;
  let eventId: string | null =
    typeof b.eventId === "string" ? b.eventId : null;
  let campaignDate: string | null =
    typeof b.campaignDateKey === "string" ? b.campaignDateKey : null;
  let mobilizeEventUrl: string | null =
    typeof b.mobilizeEventUrl === "string" ? b.mobilizeEventUrl : null;
  let mobilizeEventReferenceId: string | null =
    typeof b.mobilizeEventReferenceId === "string"
      ? b.mobilizeEventReferenceId
      : null;

  if (missionId) {
    const mission = await prisma.campaignMission.findFirst({
      where: { id: missionId },
    });
    if (!mission) throw new ValidationError("Mission not found.");
    eventId = eventId ?? mission.sourceEventId;
    const tz = getPublicAppConfig().campaignTimezone;
    campaignDate =
      campaignDate ?? campaignDateKey(mission.startsAt, tz);
  }

  if (mobilizeEventReferenceId) {
    const ref = await prisma.externalObjectReference.findFirst({
      where: { id: mobilizeEventReferenceId, provider: "MOBILIZE" },
    });
    if (!ref) {
      throw new ValidationError(
        "Mobilize event reference not found. Links must come from verified local references.",
      );
    }
  }

  const draft = await createCommunication({
    title,
    purpose,
    channel,
    campaignDateKey: campaignDate,
    missionId,
    eventId,
    staffingPlanId:
      typeof b.staffingPlanId === "string" ? b.staffingPlanId : null,
    staffingRequirementId:
      typeof b.staffingRequirementId === "string"
        ? b.staffingRequirementId
        : null,
    subject: typeof b.subject === "string" ? b.subject : null,
    bodyText: typeof b.bodyText === "string" ? b.bodyText : null,
    mobilizeEventUrl,
    mobilizeEventReferenceId,
    policyVersion: policy.version,
    policyFingerprint: policy.policyFingerprint,
    actorUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action: "communications.draft.create",
    entityType: "CampaignCommunication",
    entityId: draft.id,
    metadata: { purpose, channel, missionId },
  });
  return getCampaignCommunicationDetail(draft.id, actor);
}

export async function updateCampaignCommunicationContent(
  communicationId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const subject =
    typeof b.subject === "string" ? b.subject : row.subject;
  const bodyText =
    typeof b.bodyText === "string" ? b.bodyText : row.bodyText;
  const mobilizeEventUrl =
    typeof b.mobilizeEventUrl === "string"
      ? b.mobilizeEventUrl
      : row.mobilizeEventUrl;
  const fp = contentFingerprint({
    channel: row.channel,
    purpose: row.purpose,
    subject,
    bodyText,
    mobilizeEventUrl,
  });
  await updateCommunication(communicationId, {
    subject,
    bodyText,
    mobilizeEventUrl,
    contentFingerprint: fp,
    status:
      row.status === "DRAFT" || row.status === "CONTENT_REVIEW"
        ? "CONTENT_REVIEW"
        : "STALE",
    isStale: Boolean(row.contentFingerprint && row.contentFingerprint !== fp),
    staleReason:
      row.contentFingerprint && row.contentFingerprint !== fp
        ? "Content changed after prior fingerprint."
        : row.staleReason,
    updatedByUserId: actor.userId,
  });
  await invalidateApprovals(communicationId, ["CONTENT", "DISPATCH"], "Content changed");
  await writeAttributedAudit({
    actor,
    action: "communications.content.update",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: { contentFingerprint: fp },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

type CandidateSource =
  | "STAFFING_ASSIGNMENTS"
  | "CAMPAIGN_USERS"
  | "MANUAL"
  | "CONSENT_CONTACTS";

export async function materializeCommunicationAudience(
  communicationId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const sources = Array.isArray(b.sources)
    ? (b.sources.filter((s) => typeof s === "string") as CandidateSource[])
    : [];
  if (!sources.length) {
    throw new ValidationError("At least one explicit candidate source required.");
  }
  // Never accept aggregate Mobilize as person-level source
  if (sources.some((s) => String(s).includes("MOBILIZE_AGGREGATE"))) {
    throw new ValidationError(
      "Aggregate Mobilize records cannot become person-level audience members.",
    );
  }

  const policy = await resolvePolicy(actor);
  const nowIso = new Date().toISOString();
  const candidates: Array<{
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
    key: string;
  }> = [];

  if (sources.includes("STAFFING_ASSIGNMENTS")) {
    if (!row.missionId && !row.staffingPlanId) {
      throw new ValidationError(
        "Staffing assignment source requires a linked Mission or staffing plan.",
      );
    }
    const plan = await prisma.missionStaffingPlan.findFirst({
      where: row.staffingPlanId
        ? { id: row.staffingPlanId }
        : { missionId: row.missionId! },
      include: { assignments: true },
    });
    for (const a of plan?.assignments ?? []) {
      // Operational relevance only — evaluate without inventing consent
      const result = evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: row.channel,
        purpose: row.purpose,
        nowIso,
        contact: null,
        evidence: [],
        suppressions: [],
        policy,
        candidateSources: ["STAFFING_ASSIGNMENT"],
      });
      candidates.push({
        contactPointId: null,
        localPersonId: a.localPersonId,
        campaignUserId: a.campaignUserId,
        confirmedExternalPersonId: a.confirmedExternalPersonId,
        manualDisplayLabel: a.manualDisplayLabel,
        candidateSource: "STAFFING_ASSIGNMENT",
        eligibilityState: result.state,
        inclusionState: "CANDIDATE",
        eligibilityReasonCodes: result.blockingReasonCodes,
        warningReasonCodes: result.warningReasonCodes,
        consentEvidenceIds: result.evidenceIds,
        suppressionIds: result.suppressionIds,
        eligibilityFingerprint: result.fingerprint,
        key: `staffing:${a.id}`,
      });
    }
  }

  if (sources.includes("CAMPAIGN_USERS")) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      take: 50,
      select: { id: true, email: true, displayName: true },
    });
    for (const u of users) {
      if (!u.email) {
        const result = evaluateCommunicationEligibility({
          campaignScopeKey: "KELLY",
          channel: row.channel,
          purpose: row.purpose,
          nowIso,
          contact: null,
          evidence: [],
          suppressions: [],
          policy,
          candidateSources: ["CAMPAIGN_USER"],
        });
        candidates.push({
          campaignUserId: u.id,
          manualDisplayLabel: u.displayName ?? `User ${u.id.slice(0, 6)}`,
          candidateSource: "CAMPAIGN_USER",
          eligibilityState: result.state,
          inclusionState: "CANDIDATE",
          eligibilityReasonCodes: result.blockingReasonCodes,
          warningReasonCodes: result.warningReasonCodes,
          consentEvidenceIds: [],
          suppressionIds: [],
          eligibilityFingerprint: result.fingerprint,
          key: `user:${u.id}`,
        });
        continue;
      }
      const normalized =
        row.channel === "EMAIL"
          ? normalizeEmail(u.email)
          : normalizePhone(u.email);
      const masked = maskDestination(row.channel, normalized);
      // Contact points are created only when materializing with an explicit email channel
      // and only for campaign users — still NOT consent; eligibility will fail without evidence.
      let contactId: string | null = null;
      if (row.channel === "EMAIL") {
        const cp = await upsertContactPoint({
          channel: "EMAIL",
          normalizedDestination: normalized,
          maskedDisplay: masked,
          verificationState: "UNVERIFIED",
          campaignUserId: u.id,
          actorUserId: actor.userId,
        });
        contactId = cp.id;
      }
      const evidence = contactId
        ? toConsentInputs(await listConsentForContact(contactId))
        : [];
      const suppressions = toSuppressionInputs(
        await listAllActiveSuppressions(),
      ).filter(
        (s) =>
          !contactId ||
          true /* filtered in evaluator by matching contact set below */,
      );
      const contactSuppressions = contactId
        ? (
            await prisma.campaignCommunicationSuppression.findMany({
              where: {
                isActive: true,
                OR: [{ contactPointId: contactId }, { campaignUserId: u.id }],
              },
            })
          ).map((s) => ({
            id: s.id,
            channel: s.channel,
            allChannels: s.allChannels,
            purpose: s.purpose,
            reason: s.reason,
            isActive: s.isActive,
            effectiveAt: s.effectiveAt.toISOString(),
            expiresAt: s.expiresAt?.toISOString() ?? null,
          }))
        : [];
      const result = evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: row.channel,
        purpose: row.purpose,
        nowIso,
        contact: contactId
          ? {
              id: contactId,
              channel: row.channel,
              verificationState: "UNVERIFIED",
              maskedDisplay: masked,
            }
          : null,
        evidence,
        suppressions: contactSuppressions.length
          ? contactSuppressions
          : suppressions,
        policy,
        candidateSources: ["CAMPAIGN_USER"],
      });
      candidates.push({
        contactPointId: contactId,
        campaignUserId: u.id,
        manualDisplayLabel: u.displayName ?? masked,
        candidateSource: "CAMPAIGN_USER",
        eligibilityState: result.state,
        inclusionState: "CANDIDATE",
        eligibilityReasonCodes: result.blockingReasonCodes,
        warningReasonCodes: result.warningReasonCodes,
        consentEvidenceIds: result.evidenceIds,
        suppressionIds: result.suppressionIds,
        eligibilityFingerprint: result.fingerprint,
        key: `user:${u.id}`,
      });
    }
  }

  if (sources.includes("CONSENT_CONTACTS")) {
    const contacts = await prisma.campaignContactPoint.findMany({
      where: { isActive: true, channel: row.channel },
      take: 100,
    });
    for (const cp of contacts) {
      const evidence = toConsentInputs(await listConsentForContact(cp.id));
      const suppressions = (
        await prisma.campaignCommunicationSuppression.findMany({
          where: {
            isActive: true,
            OR: [
              { contactPointId: cp.id },
              cp.localPersonId ? { localPersonId: cp.localPersonId } : undefined,
              cp.campaignUserId
                ? { campaignUserId: cp.campaignUserId }
                : undefined,
            ].filter(Boolean) as never[],
          },
        })
      ).map((s) => ({
        id: s.id,
        channel: s.channel,
        allChannels: s.allChannels,
        purpose: s.purpose,
        reason: s.reason,
        isActive: s.isActive,
        effectiveAt: s.effectiveAt.toISOString(),
        expiresAt: s.expiresAt?.toISOString() ?? null,
      }));
      let externalMatchStatus: string | null = null;
      if (cp.confirmedExternalPersonId) {
        const match = await prisma.externalPersonMatch.findFirst({
          where: {
            externalPersonId: cp.confirmedExternalPersonId,
            provider: "MOBILIZE",
          },
        });
        externalMatchStatus = match?.status ?? "UNMATCHED";
      }
      const result = evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: row.channel,
        purpose: row.purpose,
        nowIso,
        contact: {
          id: cp.id,
          channel: cp.channel,
          verificationState: cp.verificationState,
          maskedDisplay: cp.maskedDisplay,
          externalMatchStatus,
        },
        evidence,
        suppressions,
        policy,
        candidateSources: ["CONSENT_CONTACT"],
      });
      candidates.push({
        contactPointId: cp.id,
        localPersonId: cp.localPersonId,
        campaignUserId: cp.campaignUserId,
        confirmedExternalPersonId: cp.confirmedExternalPersonId,
        manualDisplayLabel: cp.maskedDisplay,
        candidateSource: "CONSENT_CONTACT",
        eligibilityState: result.state,
        inclusionState: "CANDIDATE",
        eligibilityReasonCodes: result.blockingReasonCodes,
        warningReasonCodes: result.warningReasonCodes,
        consentEvidenceIds: result.evidenceIds,
        suppressionIds: result.suppressionIds,
        eligibilityFingerprint: result.fingerprint,
        key: `contact:${cp.id}`,
      });
    }
  }

  if (sources.includes("MANUAL") && Array.isArray(b.manualMembers)) {
    for (const raw of b.manualMembers) {
      if (!raw || typeof raw !== "object") continue;
      const m = raw as Record<string, unknown>;
      const label =
        typeof m.displayLabel === "string" ? m.displayLabel.trim() : "";
      if (!label) continue;
      const result = evaluateCommunicationEligibility({
        campaignScopeKey: "KELLY",
        channel: row.channel,
        purpose: row.purpose,
        nowIso,
        contact: null,
        evidence: [],
        suppressions: [],
        policy,
        candidateSources: ["MANUAL"],
      });
      candidates.push({
        manualDisplayLabel: label,
        candidateSource: "MANUAL",
        eligibilityState: result.state,
        inclusionState: "CANDIDATE",
        eligibilityReasonCodes: result.blockingReasonCodes,
        warningReasonCodes: result.warningReasonCodes,
        consentEvidenceIds: [],
        suppressionIds: [],
        eligibilityFingerprint: result.fingerprint,
        key: `manual:${label.toLowerCase()}`,
      });
    }
  }

  const members = await replaceAudienceMembers(
    communicationId,
    candidates.map(({ key: _k, ...rest }) => rest),
  );
  const afp = audienceFingerprint(
    members.map((m) => ({
      key: m.id,
      inclusionState: m.inclusionState,
      eligibilityFingerprint: m.eligibilityFingerprint,
    })),
  );
  await updateCommunication(communicationId, {
    audienceFingerprint: afp,
    status: "AUDIENCE_REVIEW",
    isStale: false,
    policyVersion: policy.version,
    policyFingerprint: policy.policyFingerprint,
    updatedByUserId: actor.userId,
  });
  await invalidateApprovals(
    communicationId,
    ["AUDIENCE", "DISPATCH"],
    "Audience rematerialized",
  );
  await writeAttributedAudit({
    actor,
    action: "communications.audience.materialize",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: {
      sources,
      candidateCount: members.length,
      audienceFingerprint: afp,
    },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function reviewAudienceMemberInclusion(
  communicationId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const memberId = typeof b.memberId === "string" ? b.memberId : "";
  const inclusionState = b.inclusionState as
    | "INCLUDED"
    | "EXCLUDED"
    | "EXCEPTION_INCLUDED";
  const member = row.audienceMembers.find((m) => m.id === memberId);
  if (!member) throw new ValidationError("Audience member not found.");

  if (inclusionState === "INCLUDED" || inclusionState === "EXCEPTION_INCLUDED") {
    if (member.eligibilityState === "SUPPRESSED") {
      throw new ValidationError(
        "Suppressed recipients cannot be included. Bulk inclusion never overrides suppression.",
      );
    }
    if (
      inclusionState === "EXCEPTION_INCLUDED" &&
      member.eligibilityState !== "ELIGIBLE"
    ) {
      const policy = await resolvePolicy(actor);
      if (!policy.allowOperatorAttestation) {
        throw new ValidationError(
          "Exceptional inclusion requires policy-permitted attestation and is disabled by default.",
        );
      }
    }
    if (
      inclusionState === "INCLUDED" &&
      member.eligibilityState !== "ELIGIBLE"
    ) {
      throw new ValidationError(
        "Only ELIGIBLE candidates can be included without an allowed exception.",
      );
    }
  }

  await updateAudienceMember(memberId, {
    inclusionState,
    inclusionActorUserId: actor.userId,
    inclusionNote: typeof b.note === "string" ? b.note : null,
    reviewedAt: new Date(),
    reviewedByUserId: actor.userId,
  });

  const refreshed = await findCommunicationById(communicationId);
  const afp = audienceFingerprint(
    (refreshed?.audienceMembers ?? []).map((m) => ({
      key: m.id,
      inclusionState: m.inclusionState,
      eligibilityFingerprint: m.eligibilityFingerprint,
    })),
  );
  await updateCommunication(communicationId, {
    audienceFingerprint: afp,
    updatedByUserId: actor.userId,
  });
  await invalidateApprovals(
    communicationId,
    ["AUDIENCE", "DISPATCH"],
    "Audience inclusion changed",
  );
  await writeAttributedAudit({
    actor,
    action: "communications.audience.inclusion",
    entityType: "CampaignCommunicationAudienceMember",
    entityId: memberId,
    metadata: { inclusionState, communicationId },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function approveCommunicationAudience(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  if (!row.audienceFingerprint) {
    throw new ValidationError("Materialize and review audience first.");
  }
  const included = row.audienceMembers.filter(
    (m) =>
      m.inclusionState === "INCLUDED" ||
      m.inclusionState === "EXCEPTION_INCLUDED",
  );
  if (included.some((m) => m.eligibilityState === "SUPPRESSED")) {
    throw new ValidationError("Cannot approve audience with suppressed inclusions.");
  }
  const policy = await resolvePolicy(actor);
  const expiresAt = policy.approvalExpiresHours
    ? new Date(Date.now() + policy.approvalExpiresHours * 3600_000)
    : null;
  await invalidateApprovals(communicationId, ["AUDIENCE"], "Superseded");
  await createApproval({
    communicationId,
    approvalType: "AUDIENCE",
    audienceFingerprint: row.audienceFingerprint,
    policyVersion: policy.version,
    policyFingerprint: policy.policyFingerprint,
    approvedByUserId: actor.userId,
    expiresAt,
  });
  await updateCommunication(communicationId, {
    status:
      row.approvals.some((a) => a.approvalType === "CONTENT" && !a.isInvalidated)
        ? "APPROVED"
        : "AUDIENCE_REVIEW",
    isStale: false,
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience.approve",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: { audienceFingerprint: row.audienceFingerprint },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function approveCommunicationContent(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const fp = contentFingerprint({
    channel: row.channel,
    purpose: row.purpose,
    subject: row.subject,
    bodyText: row.bodyText,
    mobilizeEventUrl: row.mobilizeEventUrl,
  });
  if (!row.bodyText?.trim() && row.channel !== "MANUAL") {
    throw new ValidationError("Content body required before approval.");
  }
  const policy = await resolvePolicy(actor);
  const expiresAt = policy.approvalExpiresHours
    ? new Date(Date.now() + policy.approvalExpiresHours * 3600_000)
    : null;
  await updateCommunication(communicationId, {
    contentFingerprint: fp,
    updatedByUserId: actor.userId,
  });
  await invalidateApprovals(communicationId, ["CONTENT"], "Superseded");
  await createApproval({
    communicationId,
    approvalType: "CONTENT",
    contentFingerprint: fp,
    policyVersion: policy.version,
    policyFingerprint: policy.policyFingerprint,
    approvedByUserId: actor.userId,
    expiresAt,
  });
  const audienceOk = row.approvals.some(
    (a) => a.approvalType === "AUDIENCE" && !a.isInvalidated,
  );
  await updateCommunication(communicationId, {
    status: audienceOk ? "APPROVED" : "CONTENT_REVIEW",
    isStale: false,
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.content.approve",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: { contentFingerprint: fp },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function prepareCommunicationQueue(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const policy = await resolvePolicy(actor);
  const contentOk = row.approvals.find(
    (a) =>
      a.approvalType === "CONTENT" &&
      !a.isInvalidated &&
      a.contentFingerprint === row.contentFingerprint,
  );
  const audienceOk = row.approvals.find(
    (a) =>
      a.approvalType === "AUDIENCE" &&
      !a.isInvalidated &&
      a.audienceFingerprint === row.audienceFingerprint,
  );
  if (!contentOk || !audienceOk) {
    throw new ValidationError(
      "Valid content and audience approvals with matching fingerprints required.",
    );
  }
  if (!row.contentFingerprint || !row.audienceFingerprint) {
    throw new ValidationError("Fingerprints required.");
  }

  const included = row.audienceMembers.filter(
    (m) =>
      m.inclusionState === "INCLUDED" ||
      m.inclusionState === "EXCEPTION_INCLUDED",
  );
  const nowIso = new Date().toISOString();
  let prepared = 0;
  let blocked = 0;

  for (const m of included) {
    let contact = null as Awaited<ReturnType<typeof findContactPointById>>;
    if (m.contactPointId) {
      contact = await findContactPointById(m.contactPointId);
    }
    const evidence = m.contactPointId
      ? toConsentInputs(await listConsentForContact(m.contactPointId))
      : [];
    const suppressions = m.contactPointId
      ? (
          await prisma.campaignCommunicationSuppression.findMany({
            where: {
              isActive: true,
              OR: [
                { contactPointId: m.contactPointId },
                m.localPersonId
                  ? { localPersonId: m.localPersonId }
                  : undefined,
                m.campaignUserId
                  ? { campaignUserId: m.campaignUserId }
                  : undefined,
              ].filter(Boolean) as never[],
            },
          })
        ).map((s) => ({
          id: s.id,
          channel: s.channel,
          allChannels: s.allChannels,
          purpose: s.purpose,
          reason: s.reason,
          isActive: s.isActive,
          effectiveAt: s.effectiveAt.toISOString(),
          expiresAt: s.expiresAt?.toISOString() ?? null,
        }))
      : [];

    let externalMatchStatus: string | null = null;
    if (m.confirmedExternalPersonId || contact?.confirmedExternalPersonId) {
      const extId =
        m.confirmedExternalPersonId ?? contact?.confirmedExternalPersonId;
      const match = await prisma.externalPersonMatch.findFirst({
        where: { externalPersonId: extId!, provider: "MOBILIZE" },
      });
      externalMatchStatus = match?.status ?? "UNMATCHED";
    }

    const result = evaluateCommunicationEligibility({
      campaignScopeKey: "KELLY",
      channel: row.channel,
      purpose: row.purpose,
      nowIso,
      contact: contact
        ? {
            id: contact.id,
            channel: contact.channel,
            verificationState: contact.verificationState,
            maskedDisplay: contact.maskedDisplay,
            externalMatchStatus,
          }
        : null,
      evidence,
      suppressions,
      policy,
      candidateSources: [m.candidateSource],
    });

    const status =
      result.state === "ELIGIBLE" && m.eligibilityState !== "SUPPRESSED"
        ? "PREPARED"
        : "BLOCKED";
    if (status === "PREPARED") prepared += 1;
    else blocked += 1;

    const idem = queueIdempotencyKey(
      communicationId,
      m.id,
      row.contentFingerprint,
      row.audienceFingerprint,
    );
    await upsertQueueItem({
      communicationId,
      audienceMemberId: m.id,
      contactPointId: m.contactPointId,
      channel: row.channel,
      destinationRef: contact ? `cp:${contact.id}` : null,
      status,
      contentFingerprint: row.contentFingerprint,
      audienceFingerprint: row.audienceFingerprint,
      idempotencyKey: idem,
      blockReasonCodes: status === "BLOCKED" ? result.blockingReasonCodes : [],
      actorUserId: actor.userId,
    });
  }

  await updateCommunication(communicationId, {
    status: "QUEUED",
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.queue.prepare",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: { prepared, blocked, externalDispatch: false },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function handoffCommunicationQueue(
  communicationId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const policy = await resolvePolicy(actor);
  if (!policy.handoffEnabled) {
    throw new ValidationError("Handoff disabled by policy.");
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const toLabel =
    typeof b.handedOffToLabel === "string" ? b.handedOffToLabel.trim() : "";
  if (!toLabel) throw new ValidationError("handedOffToLabel required.");

  const prepared = row.queueItems.filter((q) => q.status === "PREPARED");
  const now = new Date();
  for (const q of prepared) {
    await updateQueueItem(q.id, {
      status: "HANDED_OFF",
      handedOffAt: now,
      handedOffToLabel: toLabel,
      updatedByUserId: actor.userId,
    });
  }
  await updateCommunication(communicationId, {
    status: "HANDED_OFF",
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.queue.handoff",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: {
      handedOffToLabel: toLabel,
      count: prepared.length,
      notDelivery: true,
    },
  });
  return getCampaignCommunicationDetail(communicationId, actor);
}

export async function exportCommunicationQueuePreview(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const row = await findCommunicationById(communicationId);
  if (!row) throw new NotFoundError("Communication not found.");
  const policy = await resolvePolicy(actor);
  if (!policy.exportEnabled) {
    throw new ValidationError("Export disabled by policy.");
  }
  const prepared = row.queueItems.filter((q) => q.status === "PREPARED");
  const lines = [
    "audienceMemberId,channel,destinationRef,status",
    ...prepared.map((q) =>
      [
        sanitizeExportCell(q.audienceMemberId),
        sanitizeExportCell(q.channel),
        sanitizeExportCell(q.destinationRef ?? ""),
        sanitizeExportCell(q.status),
      ].join(","),
    ),
  ];
  const now = new Date();
  for (const q of prepared) {
    await updateQueueItem(q.id, {
      status: "EXPORTED",
      exportedAt: now,
      updatedByUserId: actor.userId,
    });
  }
  await updateCommunication(communicationId, {
    status: "EXPORTED",
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.queue.export",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: {
      count: prepared.length,
      notDelivery: true,
      warning: "Export leaves Kelly Calendar controls.",
    },
  });
  return {
    csv: lines.join("\n"),
    count: prepared.length,
    warning:
      "Export leaves Kelly Calendar controls. Exported ≠ sent ≠ delivered.",
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
  };
}

export async function attemptProviderDispatch(
  communicationId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const adapter = getDefaultCommunicationProviderAdapter();
  const result = await adapter.dispatch({
    queueItemId: "n/a",
    channel: "EMAIL",
    destinationRef: "n/a",
    contentFingerprint: "n/a",
    idempotencyKey: `blocked:${communicationId}`,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.dispatch.blocked",
    entityType: "CampaignCommunication",
    entityId: communicationId,
    metadata: { result },
  });
  throw new ValidationError(
    result.ok
      ? "Unexpected dispatch acceptance."
      : result.reason,
  );
}

export async function recordConsentEvidence(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const channel = b.channel as CampaignCommChannel;
  const purpose = b.purpose as CampaignCommPurpose;
  const evidenceType = b.evidenceType as CampaignCommConsentEvidenceType;
  const destination =
    typeof b.destination === "string" ? b.destination.trim() : "";
  if (!channel || !purpose || !evidenceType || !destination) {
    throw new ValidationError(
      "channel, purpose, evidenceType, and destination required.",
    );
  }
  if (evidenceType === "UNKNOWN") {
    throw new ValidationError("UNKNOWN evidence is not positive consent.");
  }
  const policy = await resolvePolicy(actor);
  if (
    evidenceType === "OPERATOR_ATTESTATION" &&
    !policy.allowOperatorAttestation
  ) {
    throw new ValidationError("Operator attestation disabled by policy.");
  }
  const normalized =
    channel === "EMAIL" ? normalizeEmail(destination) : normalizePhone(destination);
  if (!normalized) throw new ValidationError("Invalid destination.");
  const cp = await upsertContactPoint({
    channel,
    normalizedDestination: normalized,
    maskedDisplay: maskDestination(channel, normalized),
    verificationState:
      b.markVerified === true ? "OPERATOR_VERIFIED" : "UNVERIFIED",
    localPersonId: typeof b.localPersonId === "string" ? b.localPersonId : null,
    campaignUserId:
      typeof b.campaignUserId === "string" ? b.campaignUserId : null,
    actorUserId: actor.userId,
  });
  const evidence = await createConsentEvidence({
    contactPointId: cp.id,
    channel,
    purpose,
    evidenceType,
    source: typeof b.source === "string" ? b.source : "OPERATOR",
    sourceReference:
      typeof b.sourceReference === "string" ? b.sourceReference : null,
    capturedAt: new Date(),
    effectiveFrom: new Date(),
    expiresAt:
      typeof b.expiresAt === "string" ? new Date(b.expiresAt) : null,
    evidenceNote: typeof b.evidenceNote === "string" ? b.evidenceNote : null,
    actorUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.consent.create",
    entityType: "CampaignCommunicationConsentEvidence",
    entityId: evidence.id,
    metadata: {
      contactPointId: cp.id,
      channel,
      purpose,
      evidenceType,
      masked: cp.maskedDisplay,
    },
  });
  return {
    contactPointId: cp.id,
    evidenceId: evidence.id,
    maskedDisplay: cp.maskedDisplay,
  };
}

export async function recordSuppression(
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const reason = b.reason as CampaignCommSuppressionReason;
  if (!reason) throw new ValidationError("reason required.");
  const channel =
    typeof b.channel === "string" ? (b.channel as CampaignCommChannel) : null;
  let contactPointId =
    typeof b.contactPointId === "string" ? b.contactPointId : null;
  if (!contactPointId && typeof b.destination === "string" && channel) {
    const normalized =
      channel === "EMAIL"
        ? normalizeEmail(b.destination)
        : normalizePhone(b.destination);
    const cp = await upsertContactPoint({
      channel,
      normalizedDestination: normalized,
      maskedDisplay: maskDestination(channel, normalized),
      actorUserId: actor.userId,
    });
    contactPointId = cp.id;
  }
  const row = await createSuppression({
    contactPointId,
    localPersonId: typeof b.localPersonId === "string" ? b.localPersonId : null,
    campaignUserId:
      typeof b.campaignUserId === "string" ? b.campaignUserId : null,
    channel,
    allChannels: b.allChannels === true,
    purpose:
      typeof b.purpose === "string"
        ? (b.purpose as CampaignCommPurpose)
        : null,
    reason,
    source: typeof b.source === "string" ? b.source : "OPERATOR",
    effectiveAt: new Date(),
    actorUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.suppression.create",
    entityType: "CampaignCommunicationSuppression",
    entityId: row.id,
    metadata: { reason, channel, allChannels: b.allChannels === true },
  });
  return { suppressionId: row.id };
}

export async function revokeCommunicationSuppression(
  suppressionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const reason =
    typeof b.reason === "string" && b.reason.trim()
      ? b.reason.trim()
      : "";
  if (!reason) throw new ValidationError("revocation reason required.");
  const row = await revokeSuppression(suppressionId, actor.userId, reason);
  await writeAttributedAudit({
    actor,
    action: "communications.suppression.revoke",
    entityType: "CampaignCommunicationSuppression",
    entityId: row.id,
    metadata: { reason },
  });
  return { suppressionId: row.id, isActive: row.isActive };
}

export async function listSuppressionsView(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const rows = await listAllActiveSuppressions();
  return {
    items: rows.map((r) => ({
      id: r.id,
      reason: r.reason,
      channel: r.channel,
      allChannels: r.allChannels,
      purpose: r.purpose,
      effectiveAt: r.effectiveAt.toISOString(),
      contactPointId: r.contactPointId,
    })),
    notices: [OPERATOR_NOTICE, NO_INFERENCE_NOTICE],
  };
}
