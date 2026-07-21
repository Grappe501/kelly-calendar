import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashContent } from "@/lib/missions/v21/communications/composition";

const SCOPE = "KELLY";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function templateContentHash(input: {
  subjectTemplate: string | null;
  htmlTemplate: string | null;
  textTemplate: string | null;
  smsTemplate: string | null;
  complianceProfileKey: string;
}): string {
  return hashContent([
    input.subjectTemplate ?? "",
    input.htmlTemplate ?? "",
    input.textTemplate ?? "",
    input.smsTemplate ?? "",
    input.complianceProfileKey,
  ]);
}

export function compositionContentHash(input: {
  subjectDraft: string | null;
  htmlDraft: string | null;
  textDraft: string | null;
  smsDraft: string | null;
  tokenOverridesJson: unknown;
}): string {
  return hashContent([
    input.subjectDraft ?? "",
    input.htmlDraft ?? "",
    input.textDraft ?? "",
    input.smsDraft ?? "",
    JSON.stringify(input.tokenOverridesJson ?? {}),
  ]);
}

export async function listTemplates() {
  return prisma.communicationTemplate.findMany({
    where: { campaignScopeKey: SCOPE },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createTemplate(data: {
  templateKey: string;
  name: string;
  description?: string | null;
  purpose?: string | null;
  channel: "EMAIL" | "SMS";
  category:
    | "MISSION_PREPARATION"
    | "EVENT_REMINDER"
    | "EVENT_FOLLOW_UP"
    | "VOLUNTEER"
    | "RELATIONSHIP_FOLLOW_UP"
    | "INTERNAL_NOTIFICATION"
    | "GENERAL_OUTREACH"
    | "TEST_ONLY";
  createdByUserId: string | null;
}) {
  return prisma.communicationTemplate.create({
    data: {
      campaignScopeKey: SCOPE,
      templateKey: data.templateKey,
      name: data.name,
      description: data.description ?? null,
      purpose: data.purpose ?? null,
      channel: data.channel,
      category: data.category,
      status: "DRAFT",
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findTemplate(id: string) {
  return prisma.communicationTemplate.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });
}

export async function createTemplateVersion(data: {
  templateId: string;
  subjectTemplate: string | null;
  htmlTemplate: string | null;
  textTemplate: string | null;
  smsTemplate: string | null;
  requiredTokens: string[];
  optionalTokens: string[];
  complianceProfileKey: string;
  changeSummary: string | null;
  createdByUserId: string | null;
}) {
  const latest = await prisma.communicationTemplateVersion.findFirst({
    where: { templateId: data.templateId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (latest?.versionNumber ?? 0) + 1;
  const contentHash = templateContentHash(data);
  return prisma.communicationTemplateVersion.create({
    data: {
      templateId: data.templateId,
      versionNumber,
      status: "DRAFT",
      subjectTemplate: data.subjectTemplate,
      htmlTemplate: data.htmlTemplate,
      textTemplate: data.textTemplate,
      smsTemplate: data.smsTemplate,
      requiredTokensJson: toJson(data.requiredTokens),
      optionalTokensJson: toJson(data.optionalTokens),
      complianceProfileKey: data.complianceProfileKey,
      changeSummary: data.changeSummary,
      contentHash,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findTemplateVersion(id: string) {
  return prisma.communicationTemplateVersion.findUnique({
    where: { id },
    include: { template: true },
  });
}

export async function updateTemplateVersionDraft(
  id: string,
  patch: {
    subjectTemplate?: string | null;
    htmlTemplate?: string | null;
    textTemplate?: string | null;
    smsTemplate?: string | null;
    requiredTokens?: string[];
    optionalTokens?: string[];
    complianceProfileKey?: string;
    changeSummary?: string | null;
  },
) {
  const current = await findTemplateVersion(id);
  if (!current) return null;
  if (current.status !== "DRAFT" && current.status !== "REJECTED") {
    throw new Error("APPROVED_VERSION_IMMUTABLE");
  }
  const next = {
    subjectTemplate: patch.subjectTemplate ?? current.subjectTemplate,
    htmlTemplate: patch.htmlTemplate ?? current.htmlTemplate,
    textTemplate: patch.textTemplate ?? current.textTemplate,
    smsTemplate: patch.smsTemplate ?? current.smsTemplate,
    complianceProfileKey:
      patch.complianceProfileKey ?? current.complianceProfileKey,
  };
  return prisma.communicationTemplateVersion.update({
    where: { id },
    data: {
      ...next,
      requiredTokensJson:
        patch.requiredTokens !== undefined
          ? toJson(patch.requiredTokens)
          : undefined,
      optionalTokensJson:
        patch.optionalTokens !== undefined
          ? toJson(patch.optionalTokens)
          : undefined,
      changeSummary: patch.changeSummary ?? current.changeSummary,
      contentHash: templateContentHash(next),
      status: "DRAFT",
    },
  });
}

export async function setTemplateVersionStatus(
  id: string,
  status: "IN_REVIEW" | "APPROVED" | "REJECTED" | "SUPERSEDED",
  approvedByUserId?: string | null,
) {
  return prisma.communicationTemplateVersion.update({
    where: { id },
    data: {
      status,
      approvedByUserId: status === "APPROVED" ? approvedByUserId ?? null : undefined,
      approvedAt: status === "APPROVED" ? new Date() : undefined,
      retiredAt: status === "SUPERSEDED" ? new Date() : undefined,
    },
  });
}

export async function listBriefs() {
  return prisma.communicationBrief.findMany({
    where: { campaignScopeKey: SCOPE },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createBrief(data: {
  purpose: string;
  objective?: string | null;
  audienceDescription?: string | null;
  channel: "EMAIL" | "SMS";
  missionId?: string | null;
  eventId?: string | null;
  desiredAction?: string | null;
  tone?: string | null;
  operatorNotes?: string | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationBrief.create({
    data: {
      campaignScopeKey: SCOPE,
      purpose: data.purpose,
      objective: data.objective ?? null,
      audienceDescription: data.audienceDescription ?? null,
      channel: data.channel,
      missionId: data.missionId ?? null,
      eventId: data.eventId ?? null,
      desiredAction: data.desiredAction ?? null,
      tone: data.tone ?? null,
      operatorNotes: data.operatorNotes ?? null,
      status: "DRAFT",
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findBrief(id: string) {
  return prisma.communicationBrief.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: { compositions: true },
  });
}

export async function listCompositions() {
  return prisma.communicationComposition.findMany({
    where: { campaignScopeKey: SCOPE },
    include: {
      brief: true,
      templateVersion: { include: { template: true } },
      revisions: { orderBy: { revisionNumber: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createComposition(data: {
  briefId?: string | null;
  templateVersionId?: string | null;
  channel: "EMAIL" | "SMS";
  name: string;
  subjectDraft?: string | null;
  htmlDraft?: string | null;
  textDraft?: string | null;
  smsDraft?: string | null;
  createdByUserId: string | null;
}) {
  return prisma.communicationComposition.create({
    data: {
      campaignScopeKey: SCOPE,
      briefId: data.briefId ?? null,
      templateVersionId: data.templateVersionId ?? null,
      channel: data.channel,
      name: data.name,
      subjectDraft: data.subjectDraft ?? null,
      htmlDraft: data.htmlDraft ?? null,
      textDraft: data.textDraft ?? null,
      smsDraft: data.smsDraft ?? null,
      createdByUserId: data.createdByUserId,
      updatedByUserId: data.createdByUserId,
    },
  });
}

export async function findComposition(id: string) {
  return prisma.communicationComposition.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      brief: true,
      templateVersion: { include: { template: true } },
      revisions: { orderBy: { revisionNumber: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function saveCompositionRevision(input: {
  compositionId: string;
  subjectDraft: string | null;
  htmlDraft: string | null;
  textDraft: string | null;
  smsDraft: string | null;
  tokenOverridesJson: unknown;
  changeSummary: string | null;
  createdByUserId: string | null;
}) {
  const composition = await findComposition(input.compositionId);
  if (!composition) return null;
  const contentHash = compositionContentHash(input);
  const latest = composition.revisions[0];
  if (latest && latest.contentHash === contentHash) {
    // Bounded save — no duplicate revision for identical content.
    return { composition, revision: latest, created: false };
  }
  const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
  const revision = await prisma.communicationCompositionRevision.create({
    data: {
      compositionId: input.compositionId,
      revisionNumber,
      subjectSnapshot: input.subjectDraft,
      htmlSnapshot: input.htmlDraft,
      textSnapshot: input.textDraft,
      smsSnapshot: input.smsDraft,
      tokenOverridesSnapshotJson: toJson(input.tokenOverridesJson ?? {}),
      contentHash,
      changeSummary: input.changeSummary,
      createdByUserId: input.createdByUserId,
    },
  });
  const updated = await prisma.communicationComposition.update({
    where: { id: input.compositionId },
    data: {
      subjectDraft: input.subjectDraft,
      htmlDraft: input.htmlDraft,
      textDraft: input.textDraft,
      smsDraft: input.smsDraft,
      tokenOverridesJson: toJson(input.tokenOverridesJson ?? {}),
      revisionNumber,
      approvalState:
        composition.approvalState === "APPROVED" ||
        composition.approvalState === "READY_FOR_REVIEW"
          ? "DRAFT"
          : composition.approvalState,
      validationState: "NOT_VALIDATED",
      updatedByUserId: input.createdByUserId,
    },
  });
  return { composition: updated, revision, created: true };
}

export async function createCompositionApproval(data: {
  compositionId: string;
  compositionRevisionId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED" | "REVOKED";
  reviewerUserId: string | null;
  reviewNotes: string | null;
  validationSnapshotJson: unknown;
  contentHash: string;
}) {
  return prisma.communicationCompositionApproval.create({
    data: {
      compositionId: data.compositionId,
      compositionRevisionId: data.compositionRevisionId,
      decision: data.decision,
      reviewerUserId: data.reviewerUserId,
      reviewNotes: data.reviewNotes,
      validationSnapshotJson: toJson(data.validationSnapshotJson),
      contentHash: data.contentHash,
    },
  });
}

export async function updateCompositionApprovalState(
  id: string,
  approvalState: "DRAFT" | "READY_FOR_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REVOKED",
  validationState?: "NOT_VALIDATED" | "VALID" | "WARNING" | "BLOCKED",
) {
  return prisma.communicationComposition.update({
    where: { id },
    data: {
      approvalState,
      ...(validationState ? { validationState } : {}),
    },
  });
}

export async function createRenderArtifact(data: {
  compositionId: string;
  compositionRevisionId: string;
  templateVersionId: string | null;
  channel: "EMAIL" | "SMS";
  renderPurpose: "PREVIEW" | "TEST" | "APPROVAL" | "DISPATCH";
  recipientFingerprint: string;
  personalizationFingerprint: string;
  subjectRendered: string | null;
  htmlRendered: string | null;
  textRendered: string | null;
  smsRendered: string | null;
  resolvedTokensJson: unknown;
  unresolvedTokensJson: unknown;
  linkManifestJson: unknown;
  complianceManifestJson: unknown;
  contentHash: string;
  renderEngineVersion: string;
  validationResultJson: unknown;
  createdByUserId: string | null;
}) {
  return prisma.communicationRenderArtifact.create({
    data: {
      campaignScopeKey: SCOPE,
      compositionId: data.compositionId,
      compositionRevisionId: data.compositionRevisionId,
      templateVersionId: data.templateVersionId,
      channel: data.channel,
      renderPurpose: data.renderPurpose,
      recipientFingerprint: data.recipientFingerprint,
      personalizationFingerprint: data.personalizationFingerprint,
      subjectRendered: data.subjectRendered,
      htmlRendered: data.htmlRendered,
      textRendered: data.textRendered,
      smsRendered: data.smsRendered,
      resolvedTokensJson: toJson(data.resolvedTokensJson),
      unresolvedTokensJson: toJson(data.unresolvedTokensJson),
      linkManifestJson: toJson(data.linkManifestJson),
      complianceManifestJson: toJson(data.complianceManifestJson),
      contentHash: data.contentHash,
      renderEngineVersion: data.renderEngineVersion,
      validationResultJson: toJson(data.validationResultJson),
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function findRenderArtifact(id: string) {
  return prisma.communicationRenderArtifact.findFirst({
    where: { id, campaignScopeKey: SCOPE },
    include: {
      composition: true,
      compositionRevision: true,
    },
  });
}

export async function invalidateArtifactsForComposition(compositionId: string) {
  return prisma.communicationRenderArtifact.updateMany({
    where: {
      compositionId,
      invalidatedAt: null,
      renderPurpose: { in: ["DISPATCH", "APPROVAL"] },
    },
    data: { invalidatedAt: new Date() },
  });
}
