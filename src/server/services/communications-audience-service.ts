import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
import {
  assertManifestAttachable,
  buildManifestHash,
  criteriaContentHash,
  evaluateAudienceCandidates,
  explainCriteria,
  explainRecipientReason,
  listCriteriaRegistry,
  listRecipientReasons,
  personalizationIntegrityFingerprint,
  validateAudienceCriteria,
  type AudienceCriteriaDocument,
} from "@/lib/missions/v21/communications/audiences";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import {
  addStaticMember,
  createAudience,
  createAudienceApproval,
  createCandidates,
  createEvaluationRecord,
  createManifest,
  createSegmentDefinition,
  findAudience,
  findEvaluation,
  findManifest,
  findSegmentDefinition,
  listAudiences,
  setManifestStatus,
  setSegmentDefinitionStatus,
} from "@/server/repositories/communications-audience-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Audience administration requires campaign leadership access.",
    );
  }
}

function asChannel(channel: string): "EMAIL" | "SMS" {
  if (channel === "SMS") return "SMS";
  if (channel === "EMAIL") return "EMAIL";
  throw new ValidationError("D24 evaluations require EMAIL or SMS channel");
}

export async function getAudienceWorkspaceHome(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const audiences = await listAudiences();
  return {
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      d22ProductionDispatchHardBlock().reason,
      "Audience proposes recipients. Consent/suppression decide eligibility. Dispatch decides transport.",
      "Eligible at manifest creation does not guarantee eligibility at dispatch.",
      "Preview pools are FABRICATED TEST DATA.",
    ],
    audiences: audiences.map((a) => ({
      id: a.id,
      audienceKey: a.audienceKey,
      name: a.name,
      audienceType: a.audienceType,
      channelScope: a.channelScope,
      status: a.status,
      definitionCount: a.definitions.length,
      approvedDefinitions: a.definitions.filter((d) => d.status === "APPROVED")
        .length,
      latestManifestStatus: a.manifests[0]?.status ?? null,
    })),
    criteria: listCriteriaRegistry().map((c) => ({
      key: c.key,
      label: c.label,
      privacyClassification: c.privacyClassification,
      requiresApproval: c.requiresApproval,
    })),
    recipientReasons: listRecipientReasons(),
    productionDispatchEnabled: false,
  };
}

export async function createAudienceRecord(
  actor: AuthenticatedActor,
  input: {
    audienceKey: string;
    name: string;
    audienceType?:
      | "STATIC"
      | "DYNAMIC"
      | "MISSION"
      | "EVENT"
      | "RELATIONSHIP"
      | "INTERNAL"
      | "TEST_ONLY";
    channelScope?: "EMAIL" | "SMS" | "MULTI_CHANNEL";
    description?: string;
    purpose?: string;
    missionId?: string;
    eventId?: string;
  },
) {
  assertLeadership(actor);
  const key = input.audienceKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new ValidationError("audienceKey required");
  const row = await createAudience({
    audienceKey: key,
    name: input.name.trim(),
    audienceType: input.audienceType ?? "TEST_ONLY",
    channelScope: input.channelScope ?? "EMAIL",
    description: input.description ?? null,
    purpose: input.purpose ?? null,
    missionId: input.missionId ?? null,
    eventId: input.eventId ?? null,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience.created",
    entityType: "CommunicationAudience",
    entityId: row.id,
    metadata: { audienceKey: row.audienceKey, type: row.audienceType },
  });
  return row;
}

export async function createDefinitionRecord(
  actor: AuthenticatedActor,
  audienceId: string,
  input: {
    channel: "EMAIL" | "SMS";
    criteria: unknown;
    evaluationLimit?: number;
    changeSummary?: string;
  },
) {
  assertLeadership(actor);
  const audience = await findAudience(audienceId);
  if (!audience) throw new NotFoundError("Audience not found");
  const validated = validateAudienceCriteria(input.criteria, {
    audienceType: audience.audienceType,
    channelScope: audience.channelScope,
  });
  if (!validated.ok || !validated.normalized) {
    throw new ValidationError(validated.errors.join("; "));
  }
  const def = await createSegmentDefinition({
    audienceId,
    channel: input.channel,
    criteria: validated.normalized,
    evaluationLimit: input.evaluationLimit,
    changeSummary: input.changeSummary ?? null,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience_definition.created",
    entityType: "CommunicationSegmentDefinition",
    entityId: def.id,
    metadata: { versionNumber: def.versionNumber, contentHash: def.contentHash },
  });
  return {
    ...def,
    criteriaExplained: explainCriteria(validated.normalized),
  };
}

export async function submitDefinition(
  actor: AuthenticatedActor,
  definitionId: string,
) {
  assertLeadership(actor);
  const def = await findSegmentDefinition(definitionId);
  if (!def) throw new NotFoundError("Definition not found");
  if (def.status !== "DRAFT" && def.status !== "REJECTED") {
    throw new ValidationError("Only draft/rejected definitions can be submitted");
  }
  const updated = await setSegmentDefinitionStatus(definitionId, "IN_REVIEW");
  await writeAttributedAudit({
    actor,
    action: "communications.audience_definition.submitted",
    entityType: "CommunicationSegmentDefinition",
    entityId: definitionId,
  });
  return updated;
}

export async function approveDefinition(
  actor: AuthenticatedActor,
  definitionId: string,
) {
  assertLeadership(actor);
  const def = await findSegmentDefinition(definitionId);
  if (!def) throw new NotFoundError("Definition not found");
  const audience = await findAudience(def.audienceId);
  for (const prior of audience?.definitions.filter(
    (d) => d.status === "APPROVED" && d.id !== definitionId,
  ) ?? []) {
    await setSegmentDefinitionStatus(prior.id, "SUPERSEDED");
  }
  const updated = await setSegmentDefinitionStatus(
    definitionId,
    "APPROVED",
    actor.userId,
  );
  await createAudienceApproval({
    audienceId: def.audienceId,
    segmentDefinitionId: definitionId,
    decision: "APPROVED",
    reviewerUserId: actor.userId,
    criteriaHash: def.contentHash,
    summarySnapshot: { versionNumber: def.versionNumber },
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience_definition.approved",
    entityType: "CommunicationSegmentDefinition",
    entityId: definitionId,
    metadata: { contentHash: def.contentHash },
  });
  return updated;
}

export async function addStaticAudienceMember(
  actor: AuthenticatedActor,
  audienceId: string,
  localPersonId: string,
  inclusionReason?: string,
) {
  assertLeadership(actor);
  try {
    const row = await addStaticMember({
      audienceId,
      localPersonId,
      inclusionReason: inclusionReason ?? "STATIC_AUDIENCE_MEMBER",
      addedByUserId: actor.userId,
    });
    await writeAttributedAudit({
      actor,
      action: "communications.audience.static_member_added",
      entityType: "CommunicationAudienceStaticMember",
      entityId: row.id,
      metadata: { audienceId, localPersonId },
    });
    return row;
  } catch (e) {
    if (e instanceof Error && e.message.includes("STATIC_MEMBER")) {
      throw new ValidationError(e.message);
    }
    throw e;
  }
}

export async function runAudienceEvaluation(
  actor: AuthenticatedActor,
  audienceId: string,
  input: {
    definitionId?: string;
    evaluationType?: "PREVIEW" | "REVIEW" | "MANIFEST" | "TEST";
  },
) {
  assertLeadership(actor);
  const audience = await findAudience(audienceId);
  if (!audience) throw new NotFoundError("Audience not found");
  if (audience.status === "RETIRED" || audience.status === "ARCHIVED") {
    throw new ValidationError("Audience retired");
  }
  const definition =
    (input.definitionId
      ? await findSegmentDefinition(input.definitionId)
      : audience.definitions.find((d) => d.status === "APPROVED") ??
        audience.definitions[0]) ?? null;
  if (!definition) throw new ValidationError("No segment definition");

  const evaluationType = input.evaluationType ?? "PREVIEW";
  if (
    (evaluationType === "MANIFEST" || evaluationType === "REVIEW") &&
    definition.status !== "APPROVED"
  ) {
    throw new ValidationError("Manifest/review evaluation requires approved criteria");
  }

  const validated = validateAudienceCriteria(definition.criteriaJson, {
    audienceType: audience.audienceType,
    channelScope: audience.channelScope,
  });
  if (!validated.ok || !validated.normalized) {
    throw new ValidationError(validated.errors.join("; "));
  }

  // Merge static members into criteria for evaluation
  const criteria: AudienceCriteriaDocument = {
    ...validated.normalized,
    staticLocalPersonIds: [
      ...(validated.normalized.staticLocalPersonIds ?? []),
      ...audience.staticMembers.map((m) => m.localPersonId),
    ],
    fabricatedPoolKey:
      validated.normalized.fabricatedPoolKey ??
      (definition.channel === "SMS" ? "sandbox_sms" : "sandbox_email"),
  };

  const channel = asChannel(definition.channel);
  const startedAt = new Date();
  const result = evaluateAudienceCandidates({
    criteria,
    channel,
    evaluationType,
    evaluationLimit: definition.evaluationLimit,
  });

  const evaluation = await createEvaluationRecord({
    audienceId,
    segmentDefinitionId: definition.id,
    evaluationType,
    status: result.status,
    criteriaHash: criteriaContentHash(criteria),
    sourceFingerprint: result.sourceFingerprint,
    candidateCount: result.candidates.length,
    includedCount: result.includedCount,
    excludedCount: result.excludedCount,
    duplicatePersonCount: result.duplicatePersonCount,
    duplicateDestinationCount: result.duplicateDestinationCount,
    invalidDestinationCount: result.invalidDestinationCount,
    consentBlockedCount: result.consentBlockedCount,
    suppressedCount: result.suppressedCount,
    limitApplied: result.limitApplied,
    createdByUserId: actor.userId,
    startedAt,
    completedAt: new Date(),
  });

  await createCandidates(
    evaluation.id,
    result.candidates.map((c) => ({
      localPersonId: c.localPersonId,
      channel: c.channel,
      candidateStatus: c.candidateStatus,
      inclusionReasons: c.inclusionReasons,
      exclusionReasons: c.exclusionReasons,
      sourceFacts: c.sourceFacts,
      resolvedContactPointId: c.contactPointId,
      destinationFingerprint: c.destinationFingerprint,
      destinationMasked: c.destinationMasked,
      consentSnapshot: c.consentSnapshot,
      suppressionSnapshot: c.suppressionSnapshot,
      deduplicationKey: c.deduplicationKey,
    })),
  );

  await writeAttributedAudit({
    actor,
    action:
      result.status === "BLOCKED"
        ? "communications.audience.evaluation_blocked"
        : "communications.audience.evaluation_completed",
    entityType: "CommunicationAudienceEvaluation",
    entityId: evaluation.id,
    metadata: {
      evaluationType,
      includedCount: result.includedCount,
      excludedCount: result.excludedCount,
      duplicateDestinationCount: result.duplicateDestinationCount,
      fabricatedBanner: result.fabricatedBanner,
    },
  });

  return {
    evaluationId: evaluation.id,
    status: result.status,
    fabricatedBanner: result.fabricatedBanner,
    summary: {
      candidateCount: result.candidates.length,
      includedCount: result.includedCount,
      excludedCount: result.excludedCount,
      consentBlockedCount: result.consentBlockedCount,
      suppressedCount: result.suppressedCount,
      invalidDestinationCount: result.invalidDestinationCount,
      duplicatePersonCount: result.duplicatePersonCount,
      duplicateDestinationCount: result.duplicateDestinationCount,
      limitApplied: result.limitApplied,
      blockingErrors: result.blockingErrors,
    },
    candidates: result.candidates.map((c) => ({
      localPersonId: c.localPersonId,
      candidateStatus: c.candidateStatus,
      destinationMasked: c.destinationMasked,
      inclusionReasons: c.inclusionReasons.map(explainRecipientReason),
      exclusionReasons: c.exclusionReasons.map(explainRecipientReason),
      sourceFacts: {
        fabricatedBanner: c.sourceFacts.fabricatedBanner,
        displayName: c.sourceFacts.displayName,
        county: c.sourceFacts.county,
      },
    })),
    notice:
      "Eligible at evaluation does not guarantee eligibility at dispatch. Production remains blocked.",
    productionDispatchEnabled: false,
  };
}

export async function generateManifestFromEvaluation(
  actor: AuthenticatedActor,
  evaluationId: string,
) {
  assertLeadership(actor);
  const evaluation = await findEvaluation(evaluationId);
  if (!evaluation) throw new NotFoundError("Evaluation not found");
  if (
    evaluation.status !== "COMPLETED" &&
    evaluation.status !== "COMPLETED_WITH_WARNINGS"
  ) {
    throw new ValidationError("Evaluation incomplete");
  }
  if (evaluation.segmentDefinition.status !== "APPROVED") {
    throw new ValidationError("Criteria must be approved");
  }
  if (evaluation.duplicateDestinationCount > 0) {
    throw new ValidationError(
      "DUPLICATE_DESTINATION blocks manifest — resolve conflicts first",
    );
  }
  if (evaluation.evaluationType === "PREVIEW") {
    throw new ValidationError("Preview evaluations cannot create manifests");
  }

  const included = evaluation.candidates.filter(
    (c) => c.candidateStatus === "INCLUDED",
  );
  if (included.length === 0) {
    throw new ValidationError("No included candidates");
  }

  const channel = asChannel(evaluation.segmentDefinition.channel);
  const entries = included.map((c) => {
    const fp = c.destinationFingerprint!;
    return {
      localPersonId: c.localPersonId,
      contactPointId: c.resolvedContactPointId,
      channel,
      destinationFingerprint: fp,
      destinationMasked: c.destinationMasked ?? "***",
      recipientKey: `${c.localPersonId ?? "unknown"}|${channel}|${fp.slice(0, 16)}`,
      personalizationSourceFingerprint: personalizationIntegrityFingerprint({
        localPersonId: c.localPersonId,
        contactPointId: c.resolvedContactPointId,
        channel,
      }),
      consentSnapshot: c.consentSnapshotJson,
      suppressionSnapshot: c.suppressionSnapshotJson,
      eligibilityReasons: c.inclusionReasonsJson as string[],
    };
  });

  const manifestHash = buildManifestHash({
    criteriaHash: evaluation.criteriaHash,
    sourceFingerprint: evaluation.sourceFingerprint,
    entries: entries.map((e) => ({
      localPersonId: e.localPersonId,
      contactPointId: e.contactPointId,
      destinationFingerprint: e.destinationFingerprint,
      channel: e.channel,
    })),
  });

  const manifest = await createManifest({
    audienceId: evaluation.audienceId,
    evaluationId: evaluation.id,
    segmentDefinitionId: evaluation.segmentDefinitionId,
    channel,
    recipientCount: entries.length,
    manifestHash,
    criteriaHash: evaluation.criteriaHash,
    sourceFingerprint: evaluation.sourceFingerprint,
    createdByUserId: actor.userId,
    entries,
  });

  await writeAttributedAudit({
    actor,
    action: "communications.audience.manifest_generated",
    entityType: "CommunicationRecipientManifest",
    entityId: manifest.id,
    metadata: { recipientCount: manifest.recipientCount, manifestHash },
  });

  return {
    manifestId: manifest.id,
    status: manifest.status,
    recipientCount: manifest.recipientCount,
    manifestHash: manifest.manifestHash,
    notice:
      "Eligible at manifest creation does not guarantee eligibility at dispatch.",
    productionDispatchEnabled: false,
  };
}

export async function submitManifest(
  actor: AuthenticatedActor,
  manifestId: string,
) {
  assertLeadership(actor);
  const manifest = await findManifest(manifestId);
  if (!manifest) throw new NotFoundError("Manifest not found");
  if (manifest.status !== "DRAFT") {
    throw new ValidationError("Only draft manifests can be submitted");
  }
  const updated = await setManifestStatus(manifestId, "READY_FOR_REVIEW");
  await writeAttributedAudit({
    actor,
    action: "communications.audience.manifest_submitted",
    entityType: "CommunicationRecipientManifest",
    entityId: manifestId,
  });
  return updated;
}

export async function approveManifest(
  actor: AuthenticatedActor,
  manifestId: string,
  expectedManifestHash?: string,
) {
  assertLeadership(actor);
  const manifest = await findManifest(manifestId);
  if (!manifest) throw new NotFoundError("Manifest not found");
  if (manifest.status !== "READY_FOR_REVIEW" && manifest.status !== "DRAFT") {
    throw new ValidationError("Manifest not ready for approval");
  }
  if (
    expectedManifestHash &&
    expectedManifestHash !== manifest.manifestHash
  ) {
    throw new ValidationError("MANIFEST_HASH_MISMATCH");
  }
  if (manifest.evaluation.duplicateDestinationCount > 0) {
    throw new ValidationError("DUPLICATE_DESTINATION blocks approval");
  }
  const updated = await setManifestStatus(manifestId, "APPROVED", {
    approvedByUserId: actor.userId,
  });
  await createAudienceApproval({
    audienceId: manifest.audienceId,
    segmentDefinitionId: manifest.segmentDefinitionId,
    evaluationId: manifest.evaluationId,
    manifestId,
    decision: "APPROVED",
    reviewerUserId: actor.userId,
    criteriaHash: manifest.criteriaHash,
    manifestHash: manifest.manifestHash,
    summarySnapshot: { recipientCount: manifest.recipientCount },
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience.manifest_approved",
    entityType: "CommunicationRecipientManifest",
    entityId: manifestId,
    metadata: { manifestHash: manifest.manifestHash },
  });
  return {
    ...updated,
    notice: "Manifest approval does not disable kill switches or enable production.",
    productionDispatchEnabled: false,
  };
}

export async function revokeManifest(
  actor: AuthenticatedActor,
  manifestId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const updated = await setManifestStatus(manifestId, "REVOKED", {
    revocationReason: reason ?? "Operator revoked",
  });
  await writeAttributedAudit({
    actor,
    action: "communications.audience.manifest_revoked",
    entityType: "CommunicationRecipientManifest",
    entityId: manifestId,
  });
  return updated;
}

export async function getAudienceDetail(
  actor: AuthenticatedActor,
  audienceId: string,
) {
  assertLeadership(actor);
  const audience = await findAudience(audienceId);
  if (!audience) throw new NotFoundError("Audience not found");
  return {
    notices: [
      "Eligible at manifest creation does not guarantee eligibility at dispatch.",
      d22ProductionDispatchHardBlock().reason,
    ],
    audience: {
      id: audience.id,
      audienceKey: audience.audienceKey,
      name: audience.name,
      description: audience.description,
      audienceType: audience.audienceType,
      channelScope: audience.channelScope,
      status: audience.status,
      purpose: audience.purpose,
      missionId: audience.missionId,
      eventId: audience.eventId,
    },
    definitions: audience.definitions.map((d) => ({
      id: d.id,
      versionNumber: d.versionNumber,
      status: d.status,
      channel: d.channel,
      contentHash: d.contentHash,
      evaluationLimit: d.evaluationLimit,
      criteriaJson: d.criteriaJson,
    })),
    staticMembers: audience.staticMembers.map((m) => ({
      localPersonId: m.localPersonId,
      inclusionReason: m.inclusionReason,
    })),
    evaluations: audience.evaluations.map((e) => ({
      id: e.id,
      evaluationType: e.evaluationType,
      status: e.status,
      includedCount: e.includedCount,
      excludedCount: e.excludedCount,
      duplicateDestinationCount: e.duplicateDestinationCount,
      createdAt: e.createdAt.toISOString(),
    })),
    manifests: audience.manifests.map((m) => ({
      id: m.id,
      status: m.status,
      recipientCount: m.recipientCount,
      manifestHash: m.manifestHash,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function getEvaluationDetail(
  actor: AuthenticatedActor,
  evaluationId: string,
) {
  assertLeadership(actor);
  const evaluation = await findEvaluation(evaluationId);
  if (!evaluation) throw new NotFoundError("Evaluation not found");
  return {
    notices: [
      "FABRICATED TEST DATA may be present in sandbox evaluations.",
      "Eligible at evaluation does not guarantee eligibility at dispatch.",
    ],
    evaluation: {
      id: evaluation.id,
      evaluationType: evaluation.evaluationType,
      status: evaluation.status,
      candidateCount: evaluation.candidateCount,
      includedCount: evaluation.includedCount,
      excludedCount: evaluation.excludedCount,
      consentBlockedCount: evaluation.consentBlockedCount,
      suppressedCount: evaluation.suppressedCount,
      invalidDestinationCount: evaluation.invalidDestinationCount,
      duplicatePersonCount: evaluation.duplicatePersonCount,
      duplicateDestinationCount: evaluation.duplicateDestinationCount,
      limitApplied: evaluation.limitApplied,
      criteriaHash: evaluation.criteriaHash,
      sourceFingerprint: evaluation.sourceFingerprint,
    },
    candidates: evaluation.candidates.map((c) => ({
      localPersonId: c.localPersonId,
      candidateStatus: c.candidateStatus,
      destinationMasked: c.destinationMasked,
      inclusionReasons: (c.inclusionReasonsJson as string[]).map(
        explainRecipientReason,
      ),
      exclusionReasons: (c.exclusionReasonsJson as string[]).map(
        explainRecipientReason,
      ),
    })),
  };
}

export async function getManifestDetail(
  actor: AuthenticatedActor,
  manifestId: string,
) {
  assertLeadership(actor);
  const manifest = await findManifest(manifestId);
  if (!manifest) throw new NotFoundError("Manifest not found");
  const attach = assertManifestAttachable({
    status: manifest.status,
    revokedAt: manifest.revokedAt,
    channel: manifest.channel,
    artifactChannel: manifest.channel,
    manifestHash: manifest.manifestHash,
    expectedManifestHash: manifest.manifestHash,
  });
  return {
    notices: [
      "Approved manifest attachment still requires D21 recheck + production remains blocked.",
    ],
    manifest: {
      id: manifest.id,
      status: manifest.status,
      channel: manifest.channel,
      recipientCount: manifest.recipientCount,
      manifestHash: manifest.manifestHash,
      criteriaHash: manifest.criteriaHash,
      approvedAt: manifest.approvedAt?.toISOString() ?? null,
      revokedAt: manifest.revokedAt?.toISOString() ?? null,
    },
    entries: manifest.entries.map((e) => ({
      id: e.id,
      localPersonId: e.localPersonId,
      destinationMasked: e.destinationMasked,
      channel: e.channel,
      recipientKey: e.recipientKey,
    })),
    dispatchAttachment: attach,
    productionDispatchEnabled: false,
  };
}

export { assertManifestAttachable };
