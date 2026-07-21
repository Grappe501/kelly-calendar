import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
import {
  assertDispatchArtifactEligible,
  getPreviewProfile,
  hashContent,
  listRegisteredTokens,
  PREVIEW_PROFILES,
  renderCanonicalMessage,
  type CanonicalProviderMessage,
} from "@/lib/missions/v21/communications/composition";
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
  createBrief,
  createComposition,
  createCompositionApproval,
  createRenderArtifact,
  createTemplate,
  createTemplateVersion,
  findBrief,
  findComposition,
  findRenderArtifact,
  findTemplate,
  findTemplateVersion,
  invalidateArtifactsForComposition,
  listBriefs,
  listCompositions,
  listTemplates,
  saveCompositionRevision,
  setTemplateVersionStatus,
  updateCompositionApprovalState,
  updateTemplateVersionDraft,
} from "@/server/repositories/communications-composition-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Composition administration requires campaign leadership access.",
    );
  }
}

function asEmailOrSms(channel: string): "EMAIL" | "SMS" {
  if (channel === "SMS") return "SMS";
  if (channel === "EMAIL") return "EMAIL";
  throw new ValidationError("D23 composition supports EMAIL or SMS only");
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export async function getCompositionWorkspaceHome(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const [templates, briefs, compositions] = await Promise.all([
    listTemplates(),
    listBriefs(),
    listCompositions(),
  ]);
  return {
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      d22ProductionDispatchHardBlock().reason,
      "D23: Composition creates approved rendered artifacts. Dispatch transports them.",
      "Preview profiles are FABRICATED TEST DATA.",
    ],
    templates: templates.map((t) => ({
      id: t.id,
      templateKey: t.templateKey,
      name: t.name,
      channel: t.channel,
      status: t.status,
      category: t.category,
      versionCount: t.versions.length,
      approvedVersions: t.versions.filter((v) => v.status === "APPROVED").length,
    })),
    briefs: briefs.map((b) => ({
      id: b.id,
      purpose: b.purpose,
      channel: b.channel,
      status: b.status,
      updatedAt: b.updatedAt.toISOString(),
    })),
    compositions: compositions.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      approvalState: c.approvalState,
      validationState: c.validationState,
      revisionNumber: c.revisionNumber,
      templateKey: c.templateVersion?.template.templateKey ?? null,
    })),
    tokens: listRegisteredTokens().map((t) => ({
      key: t.key,
      description: t.description,
      privacyClassification: t.privacyClassification,
    })),
    previewProfiles: PREVIEW_PROFILES.map((p) => ({
      key: p.key,
      label: p.label,
      fabricatedBanner: p.fabricatedBanner,
    })),
    productionDispatchEnabled: false,
  };
}

export async function createTemplateRecord(
  actor: AuthenticatedActor,
  input: {
    templateKey: string;
    name: string;
    channel: "EMAIL" | "SMS";
    category?:
      | "MISSION_PREPARATION"
      | "EVENT_REMINDER"
      | "EVENT_FOLLOW_UP"
      | "VOLUNTEER"
      | "RELATIONSHIP_FOLLOW_UP"
      | "INTERNAL_NOTIFICATION"
      | "GENERAL_OUTREACH"
      | "TEST_ONLY";
    description?: string;
  },
) {
  assertLeadership(actor);
  const key = input.templateKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new ValidationError("templateKey required");
  const row = await createTemplate({
    templateKey: key,
    name: input.name.trim(),
    channel: input.channel,
    category: input.category ?? "GENERAL_OUTREACH",
    description: input.description ?? null,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.template.created",
    entityType: "CommunicationTemplate",
    entityId: row.id,
    metadata: { templateKey: row.templateKey, channel: row.channel },
  });
  return row;
}

export async function createTemplateVersionRecord(
  actor: AuthenticatedActor,
  templateId: string,
  input: {
    subjectTemplate?: string | null;
    htmlTemplate?: string | null;
    textTemplate?: string | null;
    smsTemplate?: string | null;
    requiredTokens?: string[];
    optionalTokens?: string[];
    complianceProfileKey?: string;
    changeSummary?: string;
  },
) {
  assertLeadership(actor);
  const template = await findTemplate(templateId);
  if (!template) throw new NotFoundError("Template not found");
  const complianceProfileKey =
    input.complianceProfileKey ??
    (template.channel === "SMS" ? "SMS_SANDBOX_TEST" : "EMAIL_SANDBOX_TEST");
  const version = await createTemplateVersion({
    templateId,
    subjectTemplate: input.subjectTemplate ?? null,
    htmlTemplate: input.htmlTemplate ?? null,
    textTemplate: input.textTemplate ?? null,
    smsTemplate: input.smsTemplate ?? null,
    requiredTokens: input.requiredTokens ?? [],
    optionalTokens: input.optionalTokens ?? [],
    complianceProfileKey,
    changeSummary: input.changeSummary ?? null,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.template_version.created",
    entityType: "CommunicationTemplateVersion",
    entityId: version.id,
    metadata: { templateId, versionNumber: version.versionNumber },
  });
  return version;
}

export async function submitTemplateVersion(
  actor: AuthenticatedActor,
  versionId: string,
) {
  assertLeadership(actor);
  const version = await findTemplateVersion(versionId);
  if (!version) throw new NotFoundError("Version not found");
  if (version.status !== "DRAFT" && version.status !== "REJECTED") {
    throw new ValidationError("Only draft/rejected versions can be submitted");
  }
  const updated = await setTemplateVersionStatus(versionId, "IN_REVIEW");
  await writeAttributedAudit({
    actor,
    action: "communications.template_version.submitted",
    entityType: "CommunicationTemplateVersion",
    entityId: versionId,
  });
  return updated;
}

export async function approveTemplateVersion(
  actor: AuthenticatedActor,
  versionId: string,
) {
  assertLeadership(actor);
  const version = await findTemplateVersion(versionId);
  if (!version) throw new NotFoundError("Version not found");
  if (version.status !== "IN_REVIEW" && version.status !== "DRAFT") {
    throw new ValidationError("Version not eligible for approval");
  }
  // Supersede prior approved versions
  for (const v of (
    await findTemplate(version.templateId)
  )?.versions.filter((x) => x.status === "APPROVED" && x.id !== versionId) ??
    []) {
    await setTemplateVersionStatus(v.id, "SUPERSEDED");
  }
  const updated = await setTemplateVersionStatus(
    versionId,
    "APPROVED",
    actor.userId,
  );
  await writeAttributedAudit({
    actor,
    action: "communications.template_version.approved",
    entityType: "CommunicationTemplateVersion",
    entityId: versionId,
    metadata: { contentHash: version.contentHash },
  });
  return updated;
}

export async function createBriefRecord(
  actor: AuthenticatedActor,
  input: {
    purpose: string;
    channel: "EMAIL" | "SMS";
    objective?: string;
    audienceDescription?: string;
    missionId?: string;
    eventId?: string;
  },
) {
  assertLeadership(actor);
  const row = await createBrief({
    purpose: input.purpose,
    channel: input.channel,
    objective: input.objective ?? null,
    audienceDescription: input.audienceDescription ?? null,
    missionId: input.missionId ?? null,
    eventId: input.eventId ?? null,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.brief.created",
    entityType: "CommunicationBrief",
    entityId: row.id,
  });
  return row;
}

export async function createCompositionRecord(
  actor: AuthenticatedActor,
  input: {
    name: string;
    channel: "EMAIL" | "SMS";
    briefId?: string;
    templateVersionId?: string;
  },
) {
  assertLeadership(actor);
  let subjectDraft: string | null = null;
  let htmlDraft: string | null = null;
  let textDraft: string | null = null;
  let smsDraft: string | null = null;
  if (input.templateVersionId) {
    const tv = await findTemplateVersion(input.templateVersionId);
    if (!tv) throw new NotFoundError("Template version not found");
    if (tv.template.channel !== input.channel) {
      throw new ValidationError("Channel mismatch with template");
    }
    subjectDraft = tv.subjectTemplate;
    htmlDraft = tv.htmlTemplate;
    textDraft = tv.textTemplate;
    smsDraft = tv.smsTemplate;
  }
  const row = await createComposition({
    name: input.name,
    channel: input.channel,
    briefId: input.briefId ?? null,
    templateVersionId: input.templateVersionId ?? null,
    subjectDraft,
    htmlDraft,
    textDraft,
    smsDraft,
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.composition.created",
    entityType: "CommunicationComposition",
    entityId: row.id,
  });
  return row;
}

export async function saveComposition(
  actor: AuthenticatedActor,
  compositionId: string,
  input: {
    subjectDraft?: string | null;
    htmlDraft?: string | null;
    textDraft?: string | null;
    smsDraft?: string | null;
    tokenOverridesJson?: Record<string, string>;
    changeSummary?: string;
  },
) {
  assertLeadership(actor);
  const current = await findComposition(compositionId);
  if (!current) throw new NotFoundError("Composition not found");
  if (current.brief?.status === "CANCELLED") {
    throw new ValidationError("Brief cancelled — composition locked");
  }
  const result = await saveCompositionRevision({
    compositionId,
    subjectDraft: input.subjectDraft ?? current.subjectDraft,
    htmlDraft: input.htmlDraft ?? current.htmlDraft,
    textDraft: input.textDraft ?? current.textDraft,
    smsDraft: input.smsDraft ?? current.smsDraft,
    tokenOverridesJson:
      input.tokenOverridesJson ?? current.tokenOverridesJson ?? {},
    changeSummary: input.changeSummary ?? null,
    createdByUserId: actor.userId,
  });
  if (!result) throw new NotFoundError("Composition not found");
  if (result.created) {
    await invalidateArtifactsForComposition(compositionId);
    await writeAttributedAudit({
      actor,
      action: "communications.composition.revision_created",
      entityType: "CommunicationCompositionRevision",
      entityId: result.revision.id,
      metadata: {
        compositionId,
        revisionNumber: result.revision.revisionNumber,
        contentHash: result.revision.contentHash,
      },
    });
  }
  return result;
}

export async function validateAndRenderComposition(
  actor: AuthenticatedActor,
  compositionId: string,
  input: {
    previewProfileKey?: string;
    renderPurpose?: "PREVIEW" | "TEST" | "APPROVAL" | "DISPATCH";
  },
) {
  assertLeadership(actor);
  const composition = await findComposition(compositionId);
  if (!composition) throw new NotFoundError("Composition not found");
  const profile = getPreviewProfile(
    input.previewProfileKey ?? "standard_supporter",
  );
  if (!profile) throw new ValidationError("Unknown preview profile");

  const requiredTokens = asStringArray(
    composition.templateVersion?.requiredTokensJson,
  );
  const optionalTokens = asStringArray(
    composition.templateVersion?.optionalTokensJson,
  );
  const overrides =
    (composition.tokenOverridesJson as Record<string, string> | null) ?? {};

  const channel = asEmailOrSms(composition.channel);
  const render = renderCanonicalMessage({
    channel,
    subjectTemplate: composition.subjectDraft,
    htmlTemplate: composition.htmlDraft,
    textTemplate: composition.textDraft,
    smsTemplate: composition.smsDraft,
    requiredTokens,
    optionalTokens,
    context: {
      ...profile.context,
      overrides,
    },
    complianceProfileKey:
      composition.templateVersion?.complianceProfileKey ??
      (channel === "SMS" ? "SMS_SANDBOX_TEST" : "EMAIL_SANDBOX_TEST"),
    renderPurpose: input.renderPurpose ?? "PREVIEW",
    recipientFingerprint: hashContent([
      "preview",
      profile.key,
      "FABRICATED_TEST_DATA",
    ]),
  });

  const validationState = render.blocked
    ? "BLOCKED"
    : render.issues.some((i) => i.severity === "WARNING")
      ? "WARNING"
      : "VALID";

  await updateCompositionApprovalState(
    compositionId,
    composition.approvalState,
    validationState,
  );

  // Ensure a revision exists for artifact binding
  const saved = await saveCompositionRevision({
    compositionId,
    subjectDraft: composition.subjectDraft,
    htmlDraft: composition.htmlDraft,
    textDraft: composition.textDraft,
    smsDraft: composition.smsDraft,
    tokenOverridesJson: composition.tokenOverridesJson,
    changeSummary: "validate-render checkpoint",
    createdByUserId: actor.userId,
  });
  if (!saved) throw new NotFoundError("Composition not found");

  const purpose = input.renderPurpose ?? "PREVIEW";
  if (purpose === "DISPATCH" && composition.approvalState !== "APPROVED") {
    throw new ValidationError(
      "DISPATCH artifacts require an approved composition revision",
    );
  }
  if (purpose === "DISPATCH" && render.blocked) {
    throw new ValidationError("Cannot create DISPATCH artifact while blocked");
  }

  const artifact = await createRenderArtifact({
    compositionId,
    compositionRevisionId: saved.revision.id,
    templateVersionId: composition.templateVersionId,
    channel,
    renderPurpose: purpose,
    recipientFingerprint: hashContent([
      "preview",
      profile.key,
      "FABRICATED_TEST_DATA",
    ]),
    personalizationFingerprint: render.personalizationFingerprint,
    subjectRendered: render.subjectRendered,
    htmlRendered: render.htmlRendered,
    textRendered: render.textRendered,
    smsRendered: render.smsRendered,
    resolvedTokensJson: render.resolvedTokens,
    unresolvedTokensJson: render.unresolvedTokens,
    linkManifestJson: render.linkManifest,
    complianceManifestJson: render.complianceManifest,
    contentHash: render.contentHash,
    renderEngineVersion: render.renderEngineVersion,
    validationResultJson: {
      ok: render.ok,
      issues: render.issues,
      fabricatedBanner: profile.fabricatedBanner,
      previewProfileKey: profile.key,
    },
    createdByUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action:
      purpose === "DISPATCH"
        ? "communications.artifact.dispatch_created"
        : "communications.composition.preview_rendered",
    entityType: "CommunicationRenderArtifact",
    entityId: artifact.id,
    metadata: {
      purpose,
      blocked: render.blocked,
      previewProfileKey: profile.key,
    },
  });

  return {
    fabricatedBanner: profile.fabricatedBanner,
    validationState,
    render,
    artifact: {
      id: artifact.id,
      renderPurpose: artifact.renderPurpose,
      contentHash: artifact.contentHash,
      createdAt: artifact.createdAt.toISOString(),
    },
    productionDispatchEnabled: false,
  };
}

export async function submitCompositionForReview(
  actor: AuthenticatedActor,
  compositionId: string,
) {
  assertLeadership(actor);
  const composition = await findComposition(compositionId);
  if (!composition) throw new NotFoundError("Composition not found");
  if (composition.validationState === "BLOCKED") {
    throw new ValidationError("Blocked compositions cannot be submitted");
  }
  if (composition.revisionNumber < 1) {
    throw new ValidationError("Save a revision before submitting");
  }
  if (
    composition.templateVersion &&
    composition.templateVersion.status !== "APPROVED"
  ) {
    throw new ValidationError("Template version must be approved");
  }
  const updated = await updateCompositionApprovalState(
    compositionId,
    "READY_FOR_REVIEW",
  );
  await writeAttributedAudit({
    actor,
    action: "communications.composition.submitted",
    entityType: "CommunicationComposition",
    entityId: compositionId,
  });
  return updated;
}

export async function approveComposition(
  actor: AuthenticatedActor,
  compositionId: string,
  reviewNotes?: string,
) {
  assertLeadership(actor);
  const composition = await findComposition(compositionId);
  if (!composition) throw new NotFoundError("Composition not found");
  if (composition.approvalState !== "READY_FOR_REVIEW") {
    throw new ValidationError("Composition not ready for approval");
  }
  if (composition.validationState === "BLOCKED") {
    throw new ValidationError("Blocked compositions cannot be approved");
  }
  const revision = composition.revisions[0];
  if (!revision) throw new ValidationError("No revision to approve");
  if (
    composition.templateVersion &&
    composition.templateVersion.status !== "APPROVED"
  ) {
    throw new ValidationError("Template version must be approved");
  }
  await createCompositionApproval({
    compositionId,
    compositionRevisionId: revision.id,
    decision: "APPROVED",
    reviewerUserId: actor.userId,
    reviewNotes: reviewNotes ?? null,
    validationSnapshotJson: { validationState: composition.validationState },
    contentHash: revision.contentHash,
  });
  const updated = await updateCompositionApprovalState(
    compositionId,
    "APPROVED",
    composition.validationState,
  );
  await writeAttributedAudit({
    actor,
    action: "communications.composition.approved",
    entityType: "CommunicationComposition",
    entityId: compositionId,
    metadata: {
      revisionId: revision.id,
      contentHash: revision.contentHash,
    },
  });
  return updated;
}

export async function revokeCompositionApproval(
  actor: AuthenticatedActor,
  compositionId: string,
  reviewNotes?: string,
) {
  assertLeadership(actor);
  const composition = await findComposition(compositionId);
  if (!composition) throw new NotFoundError("Composition not found");
  const revision = composition.revisions[0];
  if (!revision) throw new ValidationError("No revision");
  await createCompositionApproval({
    compositionId,
    compositionRevisionId: revision.id,
    decision: "REVOKED",
    reviewerUserId: actor.userId,
    reviewNotes: reviewNotes ?? null,
    validationSnapshotJson: {},
    contentHash: revision.contentHash,
  });
  await invalidateArtifactsForComposition(compositionId);
  const updated = await updateCompositionApprovalState(compositionId, "REVOKED");
  await writeAttributedAudit({
    actor,
    action: "communications.composition.revoked",
    entityType: "CommunicationComposition",
    entityId: compositionId,
  });
  return updated;
}

export async function createDispatchArtifact(
  actor: AuthenticatedActor,
  compositionId: string,
  previewProfileKey?: string,
) {
  return validateAndRenderComposition(actor, compositionId, {
    previewProfileKey,
    renderPurpose: "DISPATCH",
  });
}

/** Build transport payload for D22 adapters — never invents content. */
export function buildCanonicalProviderMessage(input: {
  artifactId: string;
  channel: "EMAIL" | "SMS";
  destination: string;
  subject: string | null;
  html: string | null;
  text: string;
  dispatchBatchId: string;
  dispatchAttemptId: string;
  contentHash: string;
  idempotencyKey: string;
}): CanonicalProviderMessage {
  return {
    artifactId: input.artifactId,
    channel: input.channel,
    destination: input.destination,
    subject: input.subject ?? undefined,
    html: input.html ?? undefined,
    text: input.text,
    metadata: {
      dispatchBatchId: input.dispatchBatchId,
      dispatchAttemptId: input.dispatchAttemptId,
      contentHash: input.contentHash,
      idempotencyKey: input.idempotencyKey,
    },
  };
}

export async function assertArtifactAttachableForDispatch(input: {
  artifactId: string;
  expectedChannel: "EMAIL" | "SMS";
  expectedRecipientFingerprint: string;
}): Promise<{
  ok: boolean;
  reasons: string[];
  artifact: Awaited<ReturnType<typeof findRenderArtifact>>;
  providerMessagePreview: CanonicalProviderMessage | null;
}> {
  const artifact = await findRenderArtifact(input.artifactId);
  if (!artifact) {
    return {
      ok: false,
      reasons: ["ARTIFACT_NOT_FOUND", "PRODUCTION_DISPATCH_BLOCKED"],
      artifact: null,
      providerMessagePreview: null,
    };
  }
  const validation = artifact.validationResultJson as { ok?: boolean } | null;
  const channel = asEmailOrSms(artifact.channel);
  const eligible = assertDispatchArtifactEligible({
    renderPurpose: artifact.renderPurpose,
    invalidatedAt: artifact.invalidatedAt,
    validationOk: validation?.ok === true,
    compositionApproved: artifact.composition.approvalState === "APPROVED",
    channel,
    expectedChannel: input.expectedChannel,
    recipientFingerprint: artifact.recipientFingerprint,
    expectedRecipientFingerprint: input.expectedRecipientFingerprint,
    contentHash: artifact.contentHash,
    expectedContentHash: artifact.contentHash,
  });
  return {
    ok: false, // always false while production blocked
    reasons: eligible.reasons,
    artifact,
    providerMessagePreview: buildCanonicalProviderMessage({
      artifactId: artifact.id,
      channel,
      destination: "(redacted)",
      subject: artifact.subjectRendered,
      html: artifact.htmlRendered,
      text: artifact.textRendered ?? artifact.smsRendered ?? "",
      dispatchBatchId: "(pending)",
      dispatchAttemptId: "(pending)",
      contentHash: artifact.contentHash,
      idempotencyKey: "(pending)",
    }),
  };
}

export async function getCompositionDetail(
  actor: AuthenticatedActor,
  compositionId: string,
) {
  assertLeadership(actor);
  const composition = await findComposition(compositionId);
  if (!composition) throw new NotFoundError("Composition not found");
  return {
    notices: [
      "Draft ≠ Preview ≠ Approved revision ≠ Dispatch artifact",
      d22ProductionDispatchHardBlock().reason,
    ],
    composition: {
      id: composition.id,
      name: composition.name,
      channel: composition.channel,
      subjectDraft: composition.subjectDraft,
      htmlDraft: composition.htmlDraft,
      textDraft: composition.textDraft,
      smsDraft: composition.smsDraft,
      validationState: composition.validationState,
      approvalState: composition.approvalState,
      revisionNumber: composition.revisionNumber,
      briefId: composition.briefId,
      templateVersionId: composition.templateVersionId,
      templateKey: composition.templateVersion?.template.templateKey ?? null,
      templateVersionStatus: composition.templateVersion?.status ?? null,
    },
    revisions: composition.revisions.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      contentHash: r.contentHash,
      changeSummary: r.changeSummary,
      createdAt: r.createdAt.toISOString(),
    })),
    approvals: composition.approvals.map((a) => ({
      id: a.id,
      decision: a.decision,
      contentHash: a.contentHash,
      createdAt: a.createdAt.toISOString(),
    })),
    artifacts: composition.artifacts.map((a) => ({
      id: a.id,
      renderPurpose: a.renderPurpose,
      contentHash: a.contentHash,
      invalidatedAt: a.invalidatedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    previewProfiles: PREVIEW_PROFILES.map((p) => ({
      key: p.key,
      label: p.label,
      fabricatedBanner: p.fabricatedBanner,
    })),
  };
}

export async function getTemplateDetail(
  actor: AuthenticatedActor,
  templateId: string,
) {
  assertLeadership(actor);
  const template = await findTemplate(templateId);
  if (!template) throw new NotFoundError("Template not found");
  return {
    template: {
      id: template.id,
      templateKey: template.templateKey,
      name: template.name,
      channel: template.channel,
      status: template.status,
      category: template.category,
      description: template.description,
    },
    versions: template.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      status: v.status,
      contentHash: v.contentHash,
      complianceProfileKey: v.complianceProfileKey,
      subjectTemplate: v.subjectTemplate,
      textTemplate: v.textTemplate,
      smsTemplate: v.smsTemplate,
      approvedAt: v.approvedAt?.toISOString() ?? null,
    })),
  };
}

// Re-export for seed / immutable check tests
export { updateTemplateVersionDraft };
