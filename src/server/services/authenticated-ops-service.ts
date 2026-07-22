import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/security/safe-error";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { previewWorkflowExpansion } from "@/features/operational-intelligence/services/workflow-expansion-service";
import { getWorkflowById } from "@/features/operational-intelligence/workflow-definitions/registry";
import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import { replaceObjectives, replacePacking, replaceProgramFlow, replaceStaffing, replaceActions, replaceCommunications } from "@/server/services/event-plan-service";
import {
  approveImportRecord,
  mergeImportRecord,
  rejectImportRecord,
} from "@/server/services/import-approval-service";

function coerceEnum(value: string | undefined, allowed: string[], fallback: string) {
  if (value && allowed.includes(value)) return value;
  return fallback;
}

export async function applyWorkflowToEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  workflowId: string;
  workflowVersion: number;
  expectedEventVersion: number;
  selectedItems?: {
    objectives?: boolean;
    programFlow?: boolean;
    packingItems?: boolean;
    staffingRoles?: boolean;
    actionItems?: boolean;
    communicationsItems?: boolean;
  };
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "WORKFLOW_APPLY",
    resource: { type: "event", id: input.eventId },
  });

  const workflow = getWorkflowById(input.workflowId);
  if (!workflow) throw new NotFoundError("Workflow not found.");
  if (workflow.version !== input.workflowVersion) {
    throw new ConflictError("Workflow version mismatch. Refresh the preview.");
  }

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { primaryCalendar: true },
  });
  if (!event || event.archivedAt) throw new NotFoundError("Event not found.");
  if (event.version !== input.expectedEventVersion) {
    throw new ConflictError(
      "This event changed after you opened it. Review the latest version before saving.",
    );
  }

  const preview = previewWorkflowExpansion({
    eventId: event.id,
    eventVersion: event.version,
    workflowId: input.workflowId,
    eventType: event.eventType,
    calendarType: event.primaryCalendar.calendarType,
  });
  if (!preview.applicability.applicable) {
    throw new ValidationError("Workflow is not applicable to this event.");
  }

  const selected = input.selectedItems ?? {
    objectives: true,
    programFlow: true,
    packingItems: true,
    staffingRoles: true,
    actionItems: true,
    communicationsItems: true,
  };

  let version = event.version;
  if (selected.objectives && preview.additions.objectives.length) {
    const r = await replaceObjectives({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.objectives.map((o) => ({
        objectiveType: coerceEnum(o.objectiveType, [
          "BUILD_RELATIONSHIPS",
          "EARN_MEDIA",
          "RECRUIT_VOLUNTEERS",
          "RAISE_MONEY",
          "MEET_VOTERS",
          "REACH_TARGET_AUDIENCE",
          "SUPPORT_ORGANIZATION",
          "DELIVER_MESSAGE",
          "GATHER_INFORMATION",
          "PREPARE_CANDIDATE",
          "COMPLIANCE",
          "CREATE_CONTENT",
          "INTERNAL_COORDINATION",
          "OTHER",
        ], "OTHER"),
        description: o.description ?? "Objective",
        isPrimary: o.isPrimary,
        successDefinition: o.successDefinition,
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }
  if (selected.programFlow && preview.additions.programFlow.length) {
    const r = await replaceProgramFlow({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.programFlow.map((p, i) => ({
        sequence: p.sequence ?? i + 1,
        activityType: coerceEnum(p.activityType, [
          "ARRIVAL",
          "HOST_GREETING",
          "PRIVATE_BRIEFING",
          "LEADERSHIP_MEETING",
          "PHOTO_LINE",
          "CANDIDATE_REMARKS",
          "QUESTIONS",
          "MEDIA_AVAILABILITY",
          "VOLUNTEER_GREETING",
          "MEAL",
          "TRAVEL_TRANSITION",
          "DEPARTURE",
          "FOLLOWUP",
          "CUSTOM",
        ], "CUSTOM"),
        title: p.title,
        durationMinutes: p.durationMinutes,
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }
  if (selected.packingItems && preview.additions.packingItems.length) {
    const r = await replacePacking({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.packingItems.map((p) => ({
        category: coerceEnum(p.category, [
          "CAMPAIGN_MATERIAL",
          "CANDIDATE_MATERIAL",
          "TECHNOLOGY",
          "SIGNAGE",
          "VOLUNTEER",
          "HOSPITALITY",
          "WEATHER",
          "SAFETY",
          "PERSONAL",
          "CUSTOM",
        ], "CUSTOM"),
        itemName: p.itemName,
        quantity: p.quantity,
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }
  if (selected.staffingRoles && preview.additions.staffingRoles.length) {
    const r = await replaceStaffing({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.staffingRoles.map((s) => ({
        roleType: coerceEnum(s.roleType, [
          "EVENT_LEAD",
          "CANDIDATE_LEAD",
          "ADVANCE_LEAD",
          "TRAVEL_LEAD",
          "DRIVER",
          "COMMUNICATIONS_LEAD",
          "PRESS_LIAISON",
          "PHOTOGRAPHER",
          "VIDEOGRAPHER",
          "VOLUNTEER_LEAD",
          "FINANCE_LEAD",
          "COMPLIANCE_LEAD",
          "SECURITY_LEAD",
          "FOLLOWUP_OWNER",
          "CUSTOM",
        ], "EVENT_LEAD"),
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }
  if (selected.actionItems && preview.additions.actionItems.length) {
    const r = await replaceActions({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.actionItems.map((a) => ({
        phase: coerceEnum(a.phase, [
          "PRE_EVENT",
          "EVENT_DAY",
          "POST_EVENT",
          "TRAVEL",
          "COMMUNICATIONS",
          "COMPLIANCE",
          "FOLLOWUP",
        ], "PRE_EVENT"),
        actionType: a.actionType ?? "OTHER",
        title: a.title,
        priority: a.priority,
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }
  if (selected.communicationsItems && preview.additions.communicationsItems.length) {
    const r = await replaceCommunications({
      actor: input.actor,
      eventId: event.id,
      expectedVersion: version,
      items: preview.additions.communicationsItems.map((c) => ({
        channel: coerceEnum(c.channel, [
          "EMAIL",
          "SMS",
          "WEBSITE",
          "FACEBOOK",
          "INSTAGRAM",
          "X",
          "TIKTOK",
          "YOUTUBE",
          "PRESS",
          "PRINT",
          "INTERNAL",
          "OTHER",
        ], "INTERNAL"),
        communicationType: coerceEnum(c.communicationType, [
          "ANNOUNCEMENT",
          "PROMOTION",
          "REMINDER",
          "PRESS_ADVISORY",
          "PRESS_RELEASE",
          "TALKING_POINTS",
          "SPEECH",
          "LIVESTREAM",
          "PHOTO",
          "VIDEO",
          "RECAP",
          "THANK_YOU",
          "RAPID_RESPONSE",
          "OTHER",
        ], "OTHER"),
        audience: c.audience,
      })),
      requestId: input.requestId,
    });
    version = r.version;
  }

  await prisma.eventWorkflowApplication.create({
    data: {
      eventId: event.id,
      workflowDefinitionId: workflow.id,
      workflowVersion: workflow.version,
      applicationMode: "MANUAL",
      appliedByUserId: input.actor.userId,
      generatedSummary: {
        selected,
        additionsCount: {
          objectives: preview.additions.objectives.length,
          programFlow: preview.additions.programFlow.length,
          packing: preview.additions.packingItems.length,
        },
      },
      sourceEventVersion: input.expectedEventVersion,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "WORKFLOW_APPLIED",
    entityType: "Event",
    entityId: event.id,
    requestId: input.requestId,
    newState: {
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      version,
    },
  });

  return {
    eventId: event.id,
    version,
    workflow: { id: workflow.id, name: workflow.name, version: workflow.version },
    applied: selected,
  };
}

export async function decideRecommendationForEvent(input: {
  actor: AuthenticatedActor;
  eventId: string;
  recommendationId: string;
  decision: "ACCEPTED" | "REJECTED" | "MODIFIED" | "DEFERRED";
  reason?: string;
  modifiedValue?: unknown;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "RECOMMENDATION_DECIDE",
    resource: { type: "event", id: input.eventId },
  });

  return withTransaction(async (tx) => {
    const rec = await tx.operationalRecommendationRecord.findFirst({
      where: { id: input.recommendationId, eventId: input.eventId },
    });
    if (!rec) throw new NotFoundError("Recommendation not found.");

    await tx.operationalRecommendationDecision.create({
      data: {
        recommendationId: rec.id,
        decision: input.decision,
        decidedByUserId: input.actor.userId,
        reason: input.reason ?? null,
        modifiedValue: input.modifiedValue as object | undefined,
        eventVersion: rec.eventVersion ?? undefined,
      },
    });
    await tx.operationalRecommendationRecord.update({
      where: { id: rec.id },
      data: { status: input.decision },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: `RECOMMENDATION_${input.decision}`,
      entityType: "OperationalRecommendationRecord",
      entityId: rec.id,
      requestId: input.requestId,
      reason: input.reason,
      tx,
    });
    return { recommendationId: rec.id, decision: input.decision };
  });
}

export async function recalculateAndPersistReadiness(input: {
  actor: AuthenticatedActor;
  eventId: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "READINESS_RECALCULATE",
    resource: { type: "event", id: input.eventId },
  });
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: {
      objectives: true,
      programFlowItems: true,
      packingItems: true,
      staffAssignments: true,
      communicationsItems: true,
      travelPlans: true,
      actionItems: true,
    },
  });
  if (!event || event.archivedAt) throw new NotFoundError("Event not found.");

  const result = calculateEventReadiness({
    event: {
      id: event.id,
      version: event.version,
      eventType: event.eventType,
      internalTitle: event.internalTitle,
      campaignDisplayTitle: event.campaignDisplayTitle,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      city: event.city,
      countyId: event.countyId,
      venueName: event.venueName,
      candidateRole: event.candidateRole,
      defaultVisibility: event.defaultVisibility,
      objectivesCount: event.objectives.length,
      programFlowCount: event.programFlowItems.length,
      packingCount: event.packingItems.length,
      staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId).length,
      staffRequiredCount: event.staffAssignments.length,
      travelRequired: event.travelPlans[0]?.travelRequired ?? false,
      travelHasDriver: Boolean(event.travelPlans[0]?.driverUserId),
      communicationsRequiredCount: event.communicationsItems.length,
      communicationsReadyCount: event.communicationsItems.filter(
        (c) => c.status === "COMPLETE",
      ).length,
      hostContactPresent: Boolean(event.venueName || event.city),
    },
  });

  const snapshot = await prisma.eventReadinessSnapshot.create({
    data: {
      eventId: event.id,
      eventVersion: event.version,
      calculationVersion: result.calculationVersion,
      overallScore: result.overallScore,
      readinessLevel: result.readinessLevel,
      domainScores: result.domains,
      criticalBlockers: result.criticalBlockers,
    },
  });

  await writeAttributedAudit({
    actor: input.actor,
    action: "READINESS_RECALCULATED",
    entityType: "Event",
    entityId: event.id,
    requestId: input.requestId,
    newState: {
      snapshotId: snapshot.id,
      overallScore: result.overallScore,
      readinessLevel: result.readinessLevel,
    },
  });

  return { readiness: result, snapshotId: snapshot.id };
}

export async function acknowledgeConflict(input: {
  actor: AuthenticatedActor;
  conflictId: string;
  reason?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "CONFLICT_ACKNOWLEDGE",
    resource: { type: "conflict", id: input.conflictId },
  });
  const conflict = await prisma.operationalConflictRecord.findUnique({
    where: { id: input.conflictId },
  });
  if (!conflict) throw new NotFoundError("Conflict not found.");
  await prisma.operationalConflictAction.create({
    data: {
      conflictId: conflict.id,
      action: "ACKNOWLEDGED",
      actorUserId: input.actor.userId,
      reason: input.reason ?? null,
    },
  });
  await writeAttributedAudit({
    actor: input.actor,
    action: "CONFLICT_ACKNOWLEDGED",
    entityType: "OperationalConflictRecord",
    entityId: conflict.id,
    requestId: input.requestId,
    reason: input.reason,
  });
  return { conflictId: conflict.id, action: "ACKNOWLEDGED" };
}

export async function overrideConflict(input: {
  actor: AuthenticatedActor;
  conflictId: string;
  reason: string;
  requestId?: string;
}) {
  if (!input.reason?.trim()) throw new ValidationError("Override reason is required.");
  await requireAuthorized(input.actor, {
    action: "CONFLICT_OVERRIDE",
    resource: { type: "conflict", id: input.conflictId },
  });
  const conflict = await prisma.operationalConflictRecord.findUnique({
    where: { id: input.conflictId },
  });
  if (!conflict) throw new NotFoundError("Conflict not found.");
  if (conflict.severity === "CRITICAL" && conflict.conflictType.includes("COMPLIANCE")) {
    throw new ValidationError("Critical compliance conflicts cannot be overridden.");
  }
  await prisma.operationalConflictAction.create({
    data: {
      conflictId: conflict.id,
      action: "OVERRIDDEN",
      actorUserId: input.actor.userId,
      reason: input.reason.trim(),
    },
  });
  await prisma.operationalConflictRecord.update({
    where: { id: conflict.id },
    data: { status: "OVERRIDDEN" },
  });
  await writeAttributedAudit({
    actor: input.actor,
    action: "CONFLICT_OVERRIDDEN",
    entityType: "OperationalConflictRecord",
    entityId: conflict.id,
    requestId: input.requestId,
    reason: input.reason.trim(),
  });
  return { conflictId: conflict.id, action: "OVERRIDDEN" };
}

export async function requestApproval(input: {
  actor: AuthenticatedActor;
  eventId: string;
  approvalType: string;
  assignedToUserId?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "APPROVAL_REQUEST",
    resource: { type: "event", id: input.eventId },
  });
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event || event.archivedAt) throw new NotFoundError("Event not found.");
  const approval = await prisma.approvalRequest.create({
    data: {
      entityType: "Event",
      entityId: input.eventId,
      approvalType: input.approvalType,
      requestedByUserId: input.actor.userId,
      assignedToUserId: input.assignedToUserId ?? null,
      status: "PENDING",
    },
  });
  await writeAttributedAudit({
    actor: input.actor,
    action: "APPROVAL_REQUESTED",
    entityType: "ApprovalRequest",
    entityId: approval.id,
    requestId: input.requestId,
  });
  return approval;
}

export async function resolveApproval(input: {
  actor: AuthenticatedActor;
  approvalId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  notes?: string;
  requestId?: string;
}) {
  await requireAuthorized(input.actor, {
    action: "APPROVAL_RESOLVE",
    resource: { type: "approval", id: input.approvalId },
  });
  return withTransaction(async (tx) => {
    const approval = await tx.approvalRequest.findUnique({
      where: { id: input.approvalId },
    });
    if (!approval) throw new NotFoundError("Approval not found.");
    if (
      approval.requestedByUserId &&
      approval.requestedByUserId === input.actor.userId &&
      input.decision === "APPROVED"
    ) {
      throw new ValidationError("Requestor may not approve their own approval request.");
    }
    await tx.approvalAction.create({
      data: {
        approvalRequestId: approval.id,
        actorUserId: input.actor.userId,
        action: input.decision,
        comment: input.notes ?? null,
      },
    });
    const updated = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status:
          input.decision === "APPROVED"
            ? "APPROVED"
            : input.decision === "REJECTED"
              ? "REJECTED"
              : "CHANGES_REQUESTED",
        resolvedAt: new Date(),
        resolutionNotes: input.notes ?? null,
      },
    });
    await writeAttributedAudit({
      actor: input.actor,
      action: `APPROVAL_${input.decision}`,
      entityType: "ApprovalRequest",
      entityId: approval.id,
      requestId: input.requestId,
      reason: input.notes,
      tx,
    });
    return updated;
  });
}

export async function decideImportRecord(input: {
  actor: AuthenticatedActor;
  importRunId: string;
  recordId: string;
  decision: "APPROVE" | "REJECT" | "MERGE";
  requestId?: string;
  notes?: string;
  canonicalEventId?: string;
}) {
  if (input.decision === "APPROVE") {
    return approveImportRecord({
      actor: input.actor,
      importRunId: input.importRunId,
      recordId: input.recordId,
      requestId: input.requestId,
      notes: input.notes,
    });
  }
  if (input.decision === "REJECT") {
    return rejectImportRecord({
      actor: input.actor,
      importRunId: input.importRunId,
      recordId: input.recordId,
      requestId: input.requestId,
      notes: input.notes,
    });
  }
  return mergeImportRecord({
    actor: input.actor,
    importRunId: input.importRunId,
    recordId: input.recordId,
    canonicalEventId: input.canonicalEventId ?? "",
    requestId: input.requestId,
    notes: input.notes,
  });
}
