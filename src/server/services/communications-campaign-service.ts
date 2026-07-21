import "server-only";
import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
import {
  assertSandboxExecutionMode,
  authorizationHash,
  batchContentHash,
  campaignRevisionContentHash,
  completionEvidenceHash,
  d25ProductionDispatchHardBlock,
  evaluateLaunchReadiness,
  normalizeRatePolicy,
  prepareBatchGate,
  runCampaignAttemptPreflight,
  selectBatchRange,
  transitionCampaignStatus,
  transitionRunStatus,
  transitionBatchStatus,
  validateScheduleWindow,
} from "@/lib/missions/v21/communications/campaigns";
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
  createCampaign,
  createCampaignRevision,
  createCompletionReport,
  createExecutionBatch,
  createExecutionPlan,
  createExecutionRun,
  createLaunchAuthorization,
  createLaunchReview,
  findCampaign,
  findCompositionRevision,
  findExecutionBatch,
  findExecutionRun,
  findManifestForCampaign,
  listCampaigns,
  revokeLaunchAuthorization,
  setCampaignRevisionStatus,
  setCampaignStatus,
  setExecutionPlanStatus,
  updateExecutionBatch,
  updateExecutionRun,
} from "@/server/repositories/communications-campaign-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Campaign administration requires campaign leadership access.",
    );
  }
}

export async function getCampaignWorkspaceHome(actor: AuthenticatedActor) {
  assertLeadership(actor);
  const campaigns = await listCampaigns();
  return {
    notices: [
      OPERATOR_NOTICE,
      NO_INFERENCE_NOTICE,
      d22ProductionDispatchHardBlock().reason,
      d25ProductionDispatchHardBlock().reason,
      "A campaign may organize execution. It may never override dispatch eligibility.",
      "Accepted by provider is not delivered.",
    ],
    campaigns: campaigns.map((c) => ({
      id: c.id,
      campaignKey: c.campaignKey,
      name: c.name,
      channel: c.channel,
      campaignType: c.campaignType,
      status: c.status,
      providerMode: c.providerMode,
      latestRevisionStatus: c.revisions[0]?.status ?? null,
      latestRunStatus: c.runs[0]?.status ?? null,
      authorized: c.authorizations.some(
        (a) => a.decision === "AUTHORIZED" && !a.revokedAt,
      ),
    })),
    productionCampaignsAuthorized: 0,
    controlledLiveTestsAuthorized: 0,
    productionRuns: 0,
    productionAttempts: 0,
    productionDispatchEnabled: false,
  };
}

export async function createCampaignRecord(
  actor: AuthenticatedActor,
  input: {
    campaignKey: string;
    name: string;
    channel: "EMAIL" | "SMS";
    campaignType?:
      | "MISSION"
      | "EVENT"
      | "FOLLOW_UP"
      | "VOLUNTEER"
      | "RELATIONSHIP"
      | "INTERNAL"
      | "TEST_ONLY"
      | "GENERAL_OUTREACH";
    description?: string;
    purpose?: string;
    compositionId?: string;
    approvedCompositionRevisionId?: string;
    recipientManifestId?: string;
    timezone?: string;
  },
) {
  assertLeadership(actor);
  const key = input.campaignKey.trim().toLowerCase().replace(/\s+/g, "_");
  if (!key) throw new ValidationError("campaignKey required");
  const row = await createCampaign({
    campaignKey: key,
    name: input.name.trim(),
    channel: input.channel,
    campaignType: input.campaignType ?? "TEST_ONLY",
    description: input.description ?? null,
    purpose: input.purpose ?? null,
    compositionId: input.compositionId ?? null,
    approvedCompositionRevisionId: input.approvedCompositionRevisionId ?? null,
    recipientManifestId: input.recipientManifestId ?? null,
    timezone: input.timezone ?? "America/Chicago",
    createdByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.created",
    entityType: "CommunicationCampaign",
    entityId: row.id,
    metadata: { campaignKey: row.campaignKey, channel: row.channel },
  });
  return row;
}

export async function getCampaignDetail(
  actor: AuthenticatedActor,
  campaignId: string,
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  return {
    notices: [
      d25ProductionDispatchHardBlock().reason,
      "Eligible at launch review does not guarantee eligibility at dispatch.",
    ],
    campaign: {
      id: campaign.id,
      campaignKey: campaign.campaignKey,
      name: campaign.name,
      description: campaign.description,
      purpose: campaign.purpose,
      channel: campaign.channel,
      campaignType: campaign.campaignType,
      status: campaign.status,
      compositionId: campaign.compositionId,
      approvedCompositionRevisionId: campaign.approvedCompositionRevisionId,
      recipientManifestId: campaign.recipientManifestId,
      providerKey: campaign.providerKey,
      providerMode: campaign.providerMode,
      timezone: campaign.timezone,
    },
    revisions: campaign.revisions.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      status: r.status,
      contentHash: r.contentHash,
      compositionRevisionId: r.compositionRevisionId,
      recipientManifestId: r.recipientManifestId,
    })),
    plans: campaign.executionPlans.map((p) => ({
      id: p.id,
      status: p.status,
      executionMode: p.executionMode,
      maximumRecipients: p.maximumRecipients,
      maximumBatchSize: p.maximumBatchSize,
      scheduledStartAt: p.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: p.scheduledEndAt?.toISOString() ?? null,
    })),
    reviews: campaign.launchReviews.map((r) => ({
      id: r.id,
      status: r.status,
      readinessHash: r.readinessHash,
      blockingIssues: r.blockingIssuesJson,
      warnings: r.warningsJson,
    })),
    authorizations: campaign.authorizations.map((a) => ({
      id: a.id,
      decision: a.decision,
      authorizedMode: a.authorizedMode,
      authorizedRecipientLimit: a.authorizedRecipientLimit,
      authorizationHash: a.authorizationHash,
      revokedAt: a.revokedAt?.toISOString() ?? null,
    })),
    runs: campaign.runs.map((r) => ({
      id: r.id,
      runNumber: r.runNumber,
      status: r.status,
      mode: r.mode,
      currentBatchNumber: r.currentBatchNumber,
      attemptCreatedCount: r.attemptCreatedCount,
      preflightPassedCount: r.preflightPassedCount,
      preflightBlockedCount: r.preflightBlockedCount,
      providerAcceptedCount: r.providerAcceptedCount,
      deliveredCount: r.deliveredCount,
      batches: r.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        status: b.status,
        plannedCount: b.plannedCount,
      })),
    })),
    productionDispatchEnabled: false,
  };
}

export async function createRevisionAndPlan(
  actor: AuthenticatedActor,
  campaignId: string,
  input?: {
    changeSummary?: string;
    maximumRecipients?: number;
    maximumBatchSize?: number;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    executionMode?: "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX";
  },
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");

  for (const prior of campaign.revisions.filter((r) => r.status === "APPROVED")) {
    await setCampaignRevisionStatus(prior.id, "SUPERSEDED");
  }

  const revision = await createCampaignRevision({
    campaignId,
    compositionRevisionId: campaign.approvedCompositionRevisionId,
    recipientManifestId: campaign.recipientManifestId,
    providerKey: campaign.providerKey,
    providerMode: campaign.providerMode,
    channel: campaign.channel as "EMAIL" | "SMS",
    timezone: campaign.timezone,
    purpose: campaign.purpose,
    compositionId: campaign.compositionId,
    changeSummary: input?.changeSummary ?? "Campaign revision",
    createdByUserId: actor.userId,
    scheduleSnapshot: {
      timezone: campaign.timezone,
      scheduledStartAt: input?.scheduledStartAt ?? null,
      scheduledEndAt: input?.scheduledEndAt ?? null,
    },
    ratePolicySnapshot: normalizeRatePolicy({
      maximumRecipients: input?.maximumRecipients,
      maximumBatchSize: input?.maximumBatchSize,
    }),
  });

  const mode = input?.executionMode ?? "MANUAL_SANDBOX";
  const modeGate = assertSandboxExecutionMode(mode);
  if (
    mode !== "MANUAL_SANDBOX" &&
    mode !== "SCHEDULED_SANDBOX"
  ) {
    throw new ValidationError(modeGate.reasons.join("; "));
  }

  const start = input?.scheduledStartAt
    ? new Date(input.scheduledStartAt)
    : new Date();
  const end = input?.scheduledEndAt
    ? new Date(input.scheduledEndAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const schedule = validateScheduleWindow({
    timezone: campaign.timezone,
    scheduledStartAt: start,
    scheduledEndAt: end,
  });
  if (!schedule.ok) {
    throw new ValidationError(schedule.errors.join("; "));
  }

  const plan = await createExecutionPlan({
    campaignId,
    campaignRevisionId: revision.id,
    executionMode: mode,
    timezone: campaign.timezone,
    scheduledStartAt: start,
    scheduledEndAt: end,
    maximumRecipients: input?.maximumRecipients ?? 10,
    maximumBatchSize: input?.maximumBatchSize ?? 5,
    createdByUserId: actor.userId,
  });

  await setCampaignStatus(campaignId, "CONFIGURING");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.revision_created",
    entityType: "CommunicationCampaignRevision",
    entityId: revision.id,
    metadata: { contentHash: revision.contentHash, planId: plan.id },
  });

  return { revision, plan, scheduleWarnings: schedule.warnings };
}

export async function submitAndApproveRevision(
  actor: AuthenticatedActor,
  revisionId: string,
  campaignId: string,
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  const revision = campaign.revisions.find((r) => r.id === revisionId);
  if (!revision) throw new NotFoundError("Revision not found");
  await setCampaignRevisionStatus(revisionId, "IN_REVIEW");
  await setCampaignRevisionStatus(revisionId, "APPROVED");
  const plan = campaign.executionPlans.find(
    (p) => p.campaignRevisionId === revisionId,
  );
  if (plan) await setExecutionPlanStatus(plan.id, "APPROVED");
  await setCampaignStatus(campaignId, "APPROVED");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.revision_approved",
    entityType: "CommunicationCampaignRevision",
    entityId: revisionId,
    metadata: { contentHash: revision.contentHash },
  });
  return { revisionId, status: "APPROVED" };
}

export async function runReadinessReview(
  actor: AuthenticatedActor,
  campaignId: string,
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  const revision =
    campaign.revisions.find((r) => r.status === "APPROVED") ??
    campaign.revisions[0];
  if (!revision) throw new ValidationError("No campaign revision");
  const plan = campaign.executionPlans.find(
    (p) => p.campaignRevisionId === revision.id,
  );
  if (!plan) throw new ValidationError("No execution plan");

  let compositionApproved = false;
  if (revision.compositionRevisionId) {
    const comp = await findCompositionRevision(revision.compositionRevisionId);
    compositionApproved =
      Boolean(comp) &&
      (comp!.composition?.approvalState === "APPROVED" ||
        campaign.campaignType === "TEST_ONLY");
  } else if (campaign.campaignType === "TEST_ONLY") {
    compositionApproved = true;
  }

  let manifestStatus: string | null = null;
  let manifestHash: string | null = null;
  let manifestChannel: string | null = null;
  let recipientCount = 0;
  if (revision.recipientManifestId) {
    const manifest = await findManifestForCampaign(revision.recipientManifestId);
    if (manifest) {
      manifestStatus = manifest.status;
      manifestHash = manifest.manifestHash;
      manifestChannel = manifest.channel;
      recipientCount = manifest.recipientCount;
    }
  }

  const readiness = evaluateLaunchReadiness({
    campaignRevisionHash: revision.contentHash,
    campaignRevisionStatus: revision.status,
    compositionRevisionId: revision.compositionRevisionId,
    compositionApproved:
      compositionApproved || campaign.campaignType === "TEST_ONLY",
    recipientManifestId: revision.recipientManifestId,
    manifestStatus,
    manifestHash,
    manifestChannel,
    campaignChannel: campaign.channel,
    executionPlanId: plan.id,
    executionMode: plan.executionMode as "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX",
    providerKey: revision.providerKey,
    providerMode: revision.providerMode,
    timezone: plan.timezone,
    scheduledStartAt: plan.scheduledStartAt,
    scheduledEndAt: plan.scheduledEndAt,
    consentServiceReachable: true,
    suppressionServiceReachable: true,
    providerSandboxCertified: true,
    killSwitchesBlocking: true,
    unresolvedDestinationConflicts: false,
    recipientCount,
    maximumRecipients: plan.maximumRecipients,
    testOnlySandboxDrill:
      campaign.campaignType === "TEST_ONLY" &&
      (!revision.recipientManifestId || !revision.compositionRevisionId),
  });

  // For TEST_ONLY sandbox drafts without bound composition/manifest, keep blocked
  // but allow operator to see checklist. Authorization still requires READY.
  const review = await createLaunchReview({
    campaignId,
    campaignRevisionId: revision.id,
    executionPlanId: plan.id,
    status: readiness.status === "READY" ? "READY" : "BLOCKED",
    checks: readiness.checks,
    blockingIssues: readiness.blockingIssues,
    warnings: readiness.warnings,
    readinessHash: readiness.readinessHash,
    reviewedByUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action:
      readiness.status === "READY"
        ? "communications.campaign.readiness_ready"
        : "communications.campaign.readiness_blocked",
    entityType: "CommunicationLaunchReview",
    entityId: review.id,
    metadata: {
      readinessHash: readiness.readinessHash,
      blocking: readiness.blockingIssues.slice(0, 12),
    },
  });

  return {
    reviewId: review.id,
    status: review.status,
    readiness,
    notice: "Readiness is advisory — D21 still rechecks every attempt.",
    productionDispatchEnabled: false,
  };
}

export async function authorizeSandboxLaunch(
  actor: AuthenticatedActor,
  campaignId: string,
  input?: {
    recipientLimit?: number;
    batchLimit?: number;
    notes?: string;
  },
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  const review =
    campaign.launchReviews.find((r) => r.status === "READY") ??
    campaign.launchReviews[0];
  if (!review || review.status !== "READY") {
    throw new ValidationError("Launch review must be READY");
  }
  const revision = campaign.revisions.find(
    (r) => r.id === review.campaignRevisionId,
  );
  if (!revision || revision.status !== "APPROVED") {
    throw new ValidationError("Approved campaign revision required");
  }
  const plan = campaign.executionPlans.find(
    (p) => p.id === review.executionPlanId,
  );
  if (!plan || plan.status !== "APPROVED") {
    throw new ValidationError("Approved execution plan required");
  }
  if (
    plan.executionMode !== "MANUAL_SANDBOX" &&
    plan.executionMode !== "SCHEDULED_SANDBOX"
  ) {
    throw new ValidationError("PRODUCTION_MODE_NOT_AUTHORIZED");
  }

  const recipientLimit = Math.min(
    input?.recipientLimit ?? 10,
    plan.maximumRecipients,
  );
  const batchLimit = Math.min(
    input?.batchLimit ?? plan.maximumBatchSize,
    plan.maximumBatchSize,
  );
  const authHash = authorizationHash({
    campaignRevisionId: revision.id,
    launchReviewId: review.id,
    readinessHash: review.readinessHash,
    authorizedMode: plan.executionMode,
    authorizedRecipientLimit: recipientLimit,
    authorizedBatchLimit: batchLimit,
    authorizedStartAt: plan.scheduledStartAt?.toISOString() ?? null,
    authorizedEndAt: plan.scheduledEndAt?.toISOString() ?? null,
  });

  const auth = await createLaunchAuthorization({
    campaignId,
    campaignRevisionId: revision.id,
    launchReviewId: review.id,
    authorizedMode: plan.executionMode as "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX",
    authorizedRecipientLimit: recipientLimit,
    authorizedBatchLimit: batchLimit,
    authorizedStartAt: plan.scheduledStartAt,
    authorizedEndAt: plan.scheduledEndAt,
    authorizationHash: authHash,
    authorizedByUserId: actor.userId,
    authorizationNotes: input?.notes ?? "Authorize sandbox launch",
  });

  const selfApproval =
    campaign.createdByUserId != null &&
    campaign.createdByUserId === actor.userId;

  await setCampaignStatus(campaignId, "READY_TO_LAUNCH");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.launch_authorized",
    entityType: "CommunicationLaunchAuthorization",
    entityId: auth.id,
    metadata: {
      authorizationHash: authHash,
      mode: plan.executionMode,
      recipientLimit,
      selfApproval,
    },
  });

  return {
    authorizationId: auth.id,
    authorizationHash: authHash,
    authorizedMode: plan.executionMode,
    authorizedRecipientLimit: recipientLimit,
    authorizedBatchLimit: batchLimit,
    selfApproval,
    notice:
      "Authorized for sandbox only. Button is Authorize sandbox launch — not Send.",
    productionDispatchEnabled: false,
  };
}

export async function createSandboxRun(
  actor: AuthenticatedActor,
  campaignId: string,
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  const auth = campaign.authorizations.find(
    (a) => a.decision === "AUTHORIZED" && !a.revokedAt,
  );
  if (!auth) throw new ValidationError("Launch authorization required");
  const plan = campaign.executionPlans.find(
    (p) => p.campaignRevisionId === auth.campaignRevisionId,
  );
  if (!plan) throw new ValidationError("Execution plan missing");

  const run = await createExecutionRun({
    campaignId,
    campaignRevisionId: auth.campaignRevisionId,
    executionPlanId: plan.id,
    launchAuthorizationId: auth.id,
    mode: auth.authorizedMode as "MANUAL_SANDBOX" | "SCHEDULED_SANDBOX",
    recipientTargetCount: auth.authorizedRecipientLimit,
    createdByUserId: actor.userId,
  });
  await updateExecutionRun(run.id, {
    status: "READY",
    startedByUserId: actor.userId,
  });
  await setCampaignStatus(campaignId, "READY_TO_LAUNCH");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.run_created",
    entityType: "CommunicationExecutionRun",
    entityId: run.id,
    metadata: { runNumber: run.runNumber },
  });
  return { runId: run.id, runNumber: run.runNumber, status: "READY" };
}

export async function prepareNextBatch(
  actor: AuthenticatedActor,
  runId: string,
) {
  assertLeadership(actor);
  const run = await findExecutionRun(runId);
  if (!run) throw new NotFoundError("Run not found");
  const auth = run.launchAuthorization;
  if (auth.decision !== "AUTHORIZED" || auth.revokedAt) {
    throw new ValidationError("AUTHORIZATION_REVOKED");
  }
  if (run.status === "CANCELLED" || run.status === "COMPLETED") {
    throw new ValidationError("RUN_TERMINAL");
  }

  const manifestId = run.campaignRevision.recipientManifestId;
  const total = manifestId
    ? (await findManifestForCampaign(manifestId))?.entries.length ?? 0
    : run.recipientTargetCount;
  const covered = run.batches.reduce((n, b) => n + b.plannedCount, 0);
  const batchNumber = run.currentBatchNumber + 1;
  const range = selectBatchRange({
    totalEntries: Math.min(total, auth.authorizedRecipientLimit),
    batchNumber,
    batchSize: Math.min(
      run.executionPlan.maximumBatchSize,
      auth.authorizedBatchLimit,
    ),
    alreadyCovered: covered,
  });
  if (!range) throw new ValidationError("NO_RECIPIENTS_REMAINING");

  const policy = normalizeRatePolicy({
    maximumRecipients: run.executionPlan.maximumRecipients,
    maximumBatchSize: run.executionPlan.maximumBatchSize,
    maximumAttemptsPerRun: run.executionPlan.maximumAttemptsPerRun,
    maximumAttemptsPerHour: run.executionPlan.maximumAttemptsPerHour,
    minimumDelayBetweenBatchesSeconds:
      run.executionPlan.minimumDelayBetweenBatchesSeconds,
  });

  const gate = prepareBatchGate({
    runStatus: run.status === "READY" ? "RUNNING" : run.status,
    policy,
    authorizationRecipientLimit: auth.authorizedRecipientLimit,
    authorizationBatchLimit: auth.authorizedBatchLimit,
    plannedCount: range.count,
    attemptsAlreadyCreated: run.attemptCreatedCount,
    attemptsInLastHour: run.attemptCreatedCount,
    secondsSinceLastBatch: null,
    executionGate: {
      runStatus: run.status === "READY" ? "RUNNING" : run.status,
      campaignCancelled: run.campaign.status === "CANCELLED",
      campaignPaused: run.status === "PAUSED",
      authorizationRevoked: Boolean(auth.revokedAt),
      authorizationExpired: false,
      authorizedStartAt: auth.authorizedStartAt,
      authorizedEndAt: auth.authorizedEndAt,
      executionMode: run.mode,
      providerMode: run.campaign.providerMode,
      sandboxAllowlisted: true,
      killSwitchBlocks: false,
    },
  });
  if (!gate.ok) {
    throw new ValidationError(gate.reasons.join("; "));
  }

  const contentHash = batchContentHash({
    campaignRevisionId: run.campaignRevisionId,
    recipientManifestId: manifestId ?? "",
    runId: run.id,
    batchNumber,
    recipientStartIndex: range.startIndex,
    recipientEndIndex: range.endIndex,
  });

  const batch = await createExecutionBatch({
    runId: run.id,
    batchNumber,
    recipientStartIndex: range.startIndex,
    recipientEndIndex: range.endIndex,
    plannedCount: range.count,
    contentHash,
  });
  await updateExecutionBatch(batch.id, { status: "READY" });
  await updateExecutionRun(run.id, {
    status: "RUNNING",
    currentBatchNumber: batchNumber,
    startedAt: run.startedAt ?? new Date(),
    lastHeartbeatAt: new Date(),
  });
  await setCampaignStatus(run.campaignId, "RUNNING");

  await writeAttributedAudit({
    actor,
    action: "communications.campaign.batch_prepared",
    entityType: "CommunicationExecutionBatch",
    entityId: batch.id,
    metadata: {
      batchNumber,
      plannedCount: range.count,
      contentHash,
    },
  });

  return {
    batchId: batch.id,
    batchNumber,
    plannedCount: range.count,
    recipientStartIndex: range.startIndex,
    recipientEndIndex: range.endIndex,
    contentHash,
    productionDispatchEnabled: false,
  };
}

export async function preflightBatch(
  actor: AuthenticatedActor,
  batchId: string,
) {
  assertLeadership(actor);
  const batch = await findExecutionBatch(batchId);
  if (!batch) throw new NotFoundError("Batch not found");
  const run = batch.run;

  // Simulate per-entry D21 preflight without contacting providers.
  let passed = 0;
  let blocked = 0;
  const sampleBlocks: string[] = [];
  for (let i = 0; i < batch.plannedCount; i += 1) {
    const pf = runCampaignAttemptPreflight(
      {
        communicationId: "d25-sandbox",
        queueItemId: `batch:${batch.id}:i${i}`,
        channel: run.campaign.channel as "EMAIL" | "SMS",
        contentFingerprint: batch.contentHash,
        audienceFingerprint: run.campaignRevision.recipientManifestId ?? "none",
        policyVersion: 1,
        policyFingerprint: "d25",
        destinationRef: `sandbox-entry-${batch.recipientStartIndex + i}`,
        hasValidContentApproval: true,
        hasValidAudienceApproval: true,
        hasValidDispatchApproval: true,
        communicationActive: true,
        communicationCancelled: false,
        queuePrepared: true,
        alreadyDispatched: false,
        contactActive: true,
        contactVerified: true,
        consentEffective: true,
        suppressionApplies: false,
        destinationChanged: false,
        mobilizeLinkValid: null,
        unknownOutcomeOpen: false,
        policyExternalDispatchEnabled: false,
        providerMode: "SANDBOX",
        providerDispatchEnabled: false,
        globalKillSwitch: true,
        emailKillSwitch: true,
        smsKillSwitch: true,
        rateLimitExceeded: false,
        recipientManifestId: run.campaignRevision.recipientManifestId,
        recipientManifestApproved: true,
        recipientManifestEntryId: `entry-${batch.recipientStartIndex + i}`,
        recipientManifestEntryMatches: true,
        destinationFingerprintMatches: true,
        channelMatchesManifest: true,
        personalizationIntegrityOk: true,
        renderArtifactId: `artifact-${batch.id}-${i}`,
        renderArtifactValid: true,
        arbitraryDestinationOverride: false,
      },
      {
        campaignId: run.campaignId,
        campaignRevisionApproved: run.campaignRevision.status === "APPROVED",
        launchAuthorizationValid:
          run.launchAuthorization.decision === "AUTHORIZED" &&
          !run.launchAuthorization.revokedAt,
        executionRunActive: run.status === "RUNNING" || run.status === "READY",
        executionBatchActive: batch.status === "READY" || batch.status === "RUNNING",
        insideAuthorizedWindow: true,
        campaignPaused: false,
        campaignCancelled: false,
        sandboxAllowlisted: true,
      },
    );
    // Expected: kill switches / policy / production block → blocked
    if (pf.ok) passed += 1;
    else {
      blocked += 1;
      if (sampleBlocks.length < 5) {
        sampleBlocks.push(...pf.blockingReasonCodes.slice(0, 3));
      }
    }
  }

  await updateExecutionBatch(batchId, {
    preflightPassedCount: passed,
    preflightBlockedCount: blocked,
    status: "READY",
  });
  await updateExecutionRun(run.id, {
    preflightPassedCount: run.preflightPassedCount + passed,
    preflightBlockedCount: run.preflightBlockedCount + blocked,
    lastHeartbeatAt: new Date(),
  });

  await writeAttributedAudit({
    actor,
    action: "communications.campaign.batch_preflight",
    entityType: "CommunicationExecutionBatch",
    entityId: batchId,
    metadata: { passed, blocked, sampleBlocks: [...new Set(sampleBlocks)] },
  });

  return {
    batchId,
    plannedCount: batch.plannedCount,
    preflightPassedCount: passed,
    preflightBlockedCount: blocked,
    sampleBlockingReasons: [...new Set(sampleBlocks)],
    notice:
      "D21 preflight executed for each planned attempt. Production remains blocked; no provider requests.",
    productionDispatchEnabled: false,
  };
}

export async function dispatchSandboxBatch(
  actor: AuthenticatedActor,
  batchId: string,
) {
  assertLeadership(actor);
  const batch = await findExecutionBatch(batchId);
  if (!batch) throw new NotFoundError("Batch not found");
  // Hard block: D25 never opens production; sandbox "dispatch" records blocked outcome.
  await updateExecutionBatch(batchId, {
    status: "COMPLETED_WITH_WARNINGS",
    completedAt: new Date(),
    providerAcceptedCount: 0,
    failedCount: 0,
    attemptCreatedCount: batch.plannedCount,
  });
  await updateExecutionRun(batch.runId, {
    attemptCreatedCount: batch.run.attemptCreatedCount + batch.plannedCount,
    lastHeartbeatAt: new Date(),
  });
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.batch_dispatch_blocked",
    entityType: "CommunicationExecutionBatch",
    entityId: batchId,
    metadata: {
      reason: d25ProductionDispatchHardBlock().reason,
      plannedCount: batch.plannedCount,
      providerRequests: 0,
    },
  });
  return {
    batchId,
    status: "COMPLETED_WITH_WARNINGS",
    providerAccepted: 0,
    providerRequests: 0,
    reason: d25ProductionDispatchHardBlock().reason,
    productionDispatchEnabled: false,
  };
}

export async function pauseRun(
  actor: AuthenticatedActor,
  runId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const run = await findExecutionRun(runId);
  if (!run) throw new NotFoundError("Run not found");
  const t = transitionRunStatus(run.status, "PAUSING");
  if (!t.ok) {
    const t2 = transitionRunStatus(run.status, "PAUSED");
    if (!t2.ok) throw new ValidationError(t.reason ?? "Cannot pause");
  }
  await updateExecutionRun(runId, {
    status: "PAUSED",
    pausedAt: new Date(),
    pauseReason: reason ?? "Operator pause",
  });
  await setCampaignStatus(run.campaignId, "PAUSED");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.run_paused",
    entityType: "CommunicationExecutionRun",
    entityId: runId,
    metadata: { reason: reason ?? "Operator pause" },
  });
  return { runId, status: "PAUSED" };
}

export async function resumeRun(actor: AuthenticatedActor, runId: string) {
  assertLeadership(actor);
  const run = await findExecutionRun(runId);
  if (!run) throw new NotFoundError("Run not found");
  if (run.status !== "PAUSED") throw new ValidationError("Run not paused");
  if (
    run.launchAuthorization.decision !== "AUTHORIZED" ||
    run.launchAuthorization.revokedAt
  ) {
    throw new ValidationError("AUTHORIZATION_REVOKED");
  }
  if (
    run.launchAuthorization.authorizedEndAt &&
    run.launchAuthorization.authorizedEndAt < new Date()
  ) {
    throw new ValidationError("AUTHORIZATION_EXPIRED");
  }
  await updateExecutionRun(runId, {
    status: "RUNNING",
    resumedAt: new Date(),
    pauseReason: null,
  });
  await setCampaignStatus(run.campaignId, "RUNNING");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.run_resumed",
    entityType: "CommunicationExecutionRun",
    entityId: runId,
  });
  return { runId, status: "RUNNING" };
}

export async function cancelRun(
  actor: AuthenticatedActor,
  runId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const run = await findExecutionRun(runId);
  if (!run) throw new NotFoundError("Run not found");
  await updateExecutionRun(runId, {
    status: "CANCELLED",
    cancelledAt: new Date(),
    cancelReason: reason ?? "Operator cancel",
  });
  for (const b of run.batches.filter(
    (x) => x.status === "PLANNED" || x.status === "READY",
  )) {
    await updateExecutionBatch(b.id, { status: "CANCELLED" });
  }
  await setCampaignStatus(run.campaignId, "CANCELLED");
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.run_cancelled",
    entityType: "CommunicationExecutionRun",
    entityId: runId,
    metadata: { reason: reason ?? "Operator cancel" },
  });
  return {
    runId,
    status: "CANCELLED",
    notice:
      "Cancellation stops new work. Provider-accepted messages (if any) remain reconcilable.",
  };
}

export async function completeRun(actor: AuthenticatedActor, runId: string) {
  assertLeadership(actor);
  const run = await findExecutionRun(runId);
  if (!run) throw new NotFoundError("Run not found");
  const warnings: string[] = [
    "Accepted by provider does not equal delivered.",
    "Unknown delivery remains unknown.",
  ];
  if (run.preflightBlockedCount > 0) {
    warnings.push("Some attempts blocked by preflight");
  }
  const evidence = {
    runId: run.id,
    attemptCreatedCount: run.attemptCreatedCount,
    preflightPassedCount: run.preflightPassedCount,
    preflightBlockedCount: run.preflightBlockedCount,
    providerAcceptedCount: run.providerAcceptedCount,
    deliveredCount: run.deliveredCount,
    unknownCount: Math.max(
      0,
      run.providerAcceptedCount - run.deliveredCount,
    ),
  };
  const evidenceHash = completionEvidenceHash(evidence);
  const report = await createCompletionReport({
    campaignId: run.campaignId,
    executionRunId: run.id,
    counts: {
      manifestCount: run.recipientTargetCount,
      attemptCount: run.attemptCreatedCount,
      preflightPassedCount: run.preflightPassedCount,
      preflightBlockedCount: run.preflightBlockedCount,
      providerAcceptedCount: run.providerAcceptedCount,
      deliveredCount: run.deliveredCount,
      unknownCount: evidence.unknownCount,
      failedCount: run.failedCount,
      retryCount: run.retryCreatedCount,
    },
    summary: evidence,
    warnings,
    blockingIssues: [],
    evidenceHash,
    startedAt: run.startedAt,
    completedAt: new Date(),
    createdByUserId: actor.userId,
  });
  await updateExecutionRun(runId, {
    status:
      warnings.length > 1 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
    completedAt: new Date(),
    completedByUserId: actor.userId,
    completionSummaryJson: evidence,
  });
  await setCampaignStatus(
    run.campaignId,
    warnings.length > 1 ? "COMPLETED_WITH_WARNINGS" : "COMPLETED",
  );
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.run_completed",
    entityType: "CommunicationCampaignCompletionReport",
    entityId: report.id,
    metadata: { evidenceHash },
  });
  return {
    reportId: report.id,
    evidenceHash,
    status: report.status,
    summary: evidence,
    warnings,
    productionDispatchEnabled: false,
  };
}

export async function revokeAuthorization(
  actor: AuthenticatedActor,
  campaignId: string,
  reason?: string,
) {
  assertLeadership(actor);
  const campaign = await findCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign not found");
  const auth = campaign.authorizations.find(
    (a) => a.decision === "AUTHORIZED" && !a.revokedAt,
  );
  if (!auth) throw new ValidationError("No active authorization");
  await revokeLaunchAuthorization(
    auth.id,
    actor.userId,
    reason ?? "Operator revoked",
  );
  await writeAttributedAudit({
    actor,
    action: "communications.campaign.authorization_revoked",
    entityType: "CommunicationLaunchAuthorization",
    entityId: auth.id,
  });
  return { authorizationId: auth.id, decision: "REVOKED" };
}

export {
  campaignRevisionContentHash,
  transitionCampaignStatus,
  transitionBatchStatus,
};
