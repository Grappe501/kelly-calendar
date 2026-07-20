import "server-only";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import {
  getMobilizeIntegrationEnv,
  mobilizeConfigStatus,
} from "@/features/mobilize-integration/config";
import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import { assertMobilizeIntegrationAdmin } from "@/features/mobilize-integration/require-mobilize-admin";
import {
  assertMobilizePublishingIsolation,
  assessMobilizePublishEligibility,
  buildCreateIdempotencyKey,
  buildUpdateIdempotencyKey,
  classifyCreateOutcome,
  compareThreeWayDocuments,
  mapLocalEventToMobilizeDocument,
  reconcileTimeslots,
  toMobilizeWirePayload,
  validatePublicationApproval,
  type LocalEventForPublish,
  type PublishMappingOptions,
} from "@/features/mobilize-integration/publishing";
import { MobilizeTransportError } from "@/features/mobilize-integration/transport";
import { ValidationError, AppError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { upsertExternalEventReference } from "@/server/repositories/mobilize-integration-repository";
import {
  completePublicationAttempt,
  consumeApproval,
  createPublicationApproval,
  createPublicationAttempt,
  findActiveApproval,
  findAttemptByIdempotencyKey,
  findMobilizeEventReference,
  findPublicationByEventId,
  listConflictPublications,
  listPublications,
  loadEventForPublish,
  upsertPublicationDraft,
} from "@/server/repositories/mobilize-publishing-repository";
function toLocalEvent(event: NonNullable<Awaited<ReturnType<typeof loadEventForPublish>>>): LocalEventForPublish {
  return {
    id: event.id,
    eventNumber: event.eventNumber,
    internalTitle: event.internalTitle,
    campaignDisplayTitle: event.campaignDisplayTitle,
    publicTitle: event.publicTitle,
    eventType: event.eventType,
    status: event.status,
    archivedAt: event.archivedAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    defaultVisibility: event.defaultVisibility,
    locationDisclosure: event.locationDisclosure,
    venueName: event.venueName,
    streetAddress: event.streetAddress,
    addressLine2: event.addressLine2,
    city: event.city,
    state: event.state,
    postalCode: event.postalCode,
    locationNotes: event.locationNotes,
    virtualMeetingUrl: event.virtualMeetingUrl,
    publicDescription: event.publicDescription,
    campaignDescription: event.campaignDescription,
    privateNotes: event.privateNotes,
    expectedAttendance: event.expectedAttendance,
    sensitivityLevel: event.sensitivityLevel,
  };
}

function parseOptions(body: unknown): PublishMappingOptions {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  return {
    eventType: typeof b.eventType === "string" ? b.eventType : null,
    visibility:
      b.visibility === "PUBLIC" || b.visibility === "PRIVATE"
        ? b.visibility
        : null,
    addressVisibility:
      b.addressVisibility === "PUBLIC" || b.addressVisibility === "PRIVATE"
        ? b.addressVisibility
        : null,
    contactEmail:
      typeof b.contactEmail === "string" ? b.contactEmail : undefined,
    contactName: typeof b.contactName === "string" ? b.contactName : undefined,
    attendeeInstructions:
      typeof b.attendeeInstructions === "string"
        ? b.attendeeInstructions
        : undefined,
    accessibilityStatus:
      typeof b.accessibilityStatus === "string"
        ? b.accessibilityStatus
        : undefined,
    accessibilityNotes:
      typeof b.accessibilityNotes === "string"
        ? b.accessibilityNotes
        : undefined,
    isVirtual: typeof b.isVirtual === "boolean" ? b.isVirtual : null,
  };
}

export async function listMobilizePublishingWorkspace(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  const config = mobilizeConfigStatus(env);
  const publications = await listPublications(100);
  return {
    config,
    publications,
    isolation: assertMobilizePublishingIsolation(),
    documentation: {
      revision: MOBILIZE_DOCS.documentationRevisionShort,
      inspectionDate: MOBILIZE_DOCS.d17InspectionDate,
      mappingVersion: MOBILIZE_DOCS.mappingVersion,
      createEndpoint: MOBILIZE_DOCS.writeEndpoints.createEvent,
      updateEndpoint: MOBILIZE_DOCS.writeEndpoints.updateEvent,
      deleteEndpoint: MOBILIZE_DOCS.writeEndpoints.deleteEvent,
    },
  };
}

export async function listMobilizePublicationConflicts(actor: AuthenticatedActor) {
  assertMobilizeIntegrationAdmin(actor);
  return {
    conflicts: await listConflictPublications(),
    isolation: assertMobilizePublishingIsolation(),
  };
}

export async function getMobilizeEventPublication(
  actor: AuthenticatedActor,
  eventId: string,
) {
  assertMobilizeIntegrationAdmin(actor);
  const event = await loadEventForPublish(eventId);
  if (!event) {
    throw new ValidationError("Event not found.");
  }
  const publication = await findPublicationByEventId(eventId);
  const ref = await findMobilizeEventReference(eventId);
  const env = getMobilizeIntegrationEnv();
  return {
    event: {
      id: event.id,
      eventNumber: event.eventNumber,
      title: event.campaignDisplayTitle,
      status: event.status,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      eventType: event.eventType,
    },
    publication,
    externalReference: ref
      ? {
          id: ref.id,
          externalObjectId: ref.externalObjectId,
          syncStatus: ref.syncStatus,
          lastRemoteModifiedAt: ref.remoteUpdatedAt?.toISOString() ?? null,
        }
      : null,
    config: mobilizeConfigStatus(env),
    panelStatus: derivePanelStatus(publication, event.status, Boolean(ref)),
    isolation: assertMobilizePublishingIsolation(),
  };
}

function derivePanelStatus(
  publication: Awaited<ReturnType<typeof findPublicationByEventId>>,
  eventStatus: string,
  hasRef: boolean,
): string {
  if (eventStatus === "CANCELLED") return "CANCELLED_LOCAL";
  if (!publication && !hasRef) return "NOT_LINKED";
  if (!publication) return hasRef ? "PUBLISHED" : "NOT_LINKED";
  return publication.status;
}

export async function previewMobilizePublication(
  actor: AuthenticatedActor,
  eventId: string,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  const eventRow = await loadEventForPublish(eventId);
  if (!eventRow) throw new ValidationError("Event not found.");
  const event = toLocalEvent(eventRow);
  const ref = await findMobilizeEventReference(eventId);
  const existing = await findPublicationByEventId(eventId);
  const options = parseOptions(body);
  if (!options.contactEmail && env.defaultContactEmail) {
    options.contactEmail = env.defaultContactEmail;
  }

  const eligibility = assessMobilizePublishEligibility({
    event,
    campaignAuthorized: true,
    connectionState: env.apiKey ? "CONFIGURED_UNVERIFIED" : "NOT_CONFIGURED",
    organizationId: env.organizationId,
    expectedOrganizationId: env.organizationId,
    publishingEnabled: env.publishingEnabled,
    updatesEnabled: env.updatesEnabled,
    hasActiveMobilizeReference: Boolean(ref),
    unresolvedConflict: existing?.status === "CONFLICT",
    mappingOptions: options,
  });

  const mapping = eligibility.mappingPreview!;
  const publication = await upsertPublicationDraft({
    eventId,
    mappingVersion: mapping.mappingVersion,
    localFingerprint: mapping.localFingerprint,
    proposedPayloadFingerprint: mapping.payloadFingerprint,
    targetOrganizationId: env.organizationId,
    status: eligibility.eligible ? "PREVIEWED" : "DRAFT",
    actorUserId: actor.userId,
    conflictState: existing?.conflictState === "DETECTED" ? "DETECTED" : "NONE",
  });

  await writeAttributedAudit({
    actor,
    action: "mobilize.publication.preview",
    entityType: "ExternalPublication",
    entityId: publication.id,
    metadata: {
      eventId,
      eligible: eligibility.eligible,
      action: eligibility.action,
      mappingVersion: mapping.mappingVersion,
      issueCount: eligibility.issues.length,
    },
  });

  return {
    publicationId: publication.id,
    eligibility,
    mapping: {
      version: mapping.mappingVersion,
      fields: mapping.fields,
      privacyWarnings: mapping.privacyWarnings,
      omittedSensitive: mapping.omittedSensitive,
      localFingerprint: mapping.localFingerprint,
      payloadFingerprint: mapping.payloadFingerprint,
      document: mapping.document
        ? toMobilizeWirePayload(mapping.document)
        : null,
    },
    networkWriteAvailable:
      eligibility.action === "CREATE"
        ? Boolean(env.apiKey && env.organizationId && env.publishingEnabled)
        : Boolean(env.apiKey && env.organizationId && env.updatesEnabled),
    isolation: assertMobilizePublishingIsolation(),
  };
}

export async function approveMobilizePublication(
  actor: AuthenticatedActor,
  eventId: string,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.organizationId) {
    throw new ValidationError(
      "MOBILIZE_ORGANIZATION_ID is required to bind an approval target organization.",
    );
  }
  const preview = await previewMobilizePublication(actor, eventId, body);
  if (!preview.eligibility.eligible || !preview.mapping.payloadFingerprint) {
    throw new ValidationError("Publication is not eligible for approval.");
  }
  const publication = await findPublicationByEventId(eventId);
  if (!publication) throw new ValidationError("Publication draft missing.");

  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const approval = await createPublicationApproval({
    publicationId: publication.id,
    actionType: preview.eligibility.action === "UPDATE" ? "UPDATE" : "CREATE",
    localFingerprint: preview.mapping.localFingerprint,
    payloadFingerprint: preview.mapping.payloadFingerprint,
    mappingVersion: preview.mapping.version,
    targetOrganizationId: env.organizationId,
    approvedByUserId: actor.userId,
    reason: typeof b.reason === "string" ? b.reason : null,
  });

  await upsertPublicationDraft({
    eventId,
    mappingVersion: preview.mapping.version,
    localFingerprint: preview.mapping.localFingerprint,
    proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
    targetOrganizationId: env.organizationId,
    status: "APPROVED",
    actorUserId: actor.userId,
  });

  await writeAttributedAudit({
    actor,
    action: "mobilize.publication.approve",
    entityType: "ExternalPublicationApproval",
    entityId: approval.id,
    metadata: {
      eventId,
      actionType: approval.actionType,
      mappingVersion: approval.mappingVersion,
    },
  });

  return {
    approval: {
      id: approval.id,
      actionType: approval.actionType,
      expiresAt: approval.expiresAt?.toISOString() ?? null,
      localFingerprint: approval.localFingerprint,
      payloadFingerprint: approval.payloadFingerprint,
      mappingVersion: approval.mappingVersion,
      targetOrganizationId: approval.targetOrganizationId,
    },
    isolation: assertMobilizePublishingIsolation(),
  };
}

export async function publishMobilizeEvent(
  actor: AuthenticatedActor,
  eventId: string,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  const config = mobilizeConfigStatus(env);

  if (!config.networkPublishingAvailable && !config.networkUpdatesAvailable) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage:
        "Mobilize network publishing/updates are disabled or not configured. Preview and approval remain available.",
    });
  }

  const ref = await findMobilizeEventReference(eventId);
  const action = ref ? "UPDATE" : "CREATE";
  if (action === "CREATE" && !config.networkPublishingAvailable) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage: "MOBILIZE_PUBLISHING_ENABLED is off or credentials missing.",
    });
  }
  if (action === "UPDATE" && !config.networkUpdatesAvailable) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 409,
      publicMessage: "MOBILIZE_UPDATES_ENABLED is off or credentials missing.",
    });
  }

  const preview = await previewMobilizePublication(actor, eventId, body);
  if (!preview.eligibility.eligible || !preview.mapping.document) {
    throw new ValidationError("Cannot publish — eligibility failed.");
  }
  if (!env.organizationId || !env.apiKey) {
    throw new ValidationError("Mobilize credentials are not configured.");
  }

  const publication = await findPublicationByEventId(eventId);
  if (!publication) throw new ValidationError("Publication missing.");

  const approval = await findActiveApproval(publication.id, action);
  if (!approval) {
    throw new ValidationError("Active approval required before publish.");
  }
  const approvalCheck = validatePublicationApproval({
    approval: {
      eventId,
      actionType: action,
      mappingVersion: approval.mappingVersion,
      localFingerprint: approval.localFingerprint,
      payloadFingerprint: approval.payloadFingerprint,
      targetOrganizationId: approval.targetOrganizationId,
      approvedByUserId: approval.approvedByUserId ?? actor.userId,
      approvedAt: approval.approvedAt.toISOString(),
      expiresAt: approval.expiresAt?.toISOString() ?? null,
      state: approval.state,
    },
    currentLocalFingerprint: preview.mapping.localFingerprint,
    currentPayloadFingerprint: preview.mapping.payloadFingerprint!,
    currentMappingVersion: preview.mapping.version,
    currentOrganizationId: env.organizationId,
  });
  if (!approvalCheck.ok) {
    throw new ValidationError(approvalCheck.message);
  }

  const idempotencyKey =
    action === "CREATE"
      ? buildCreateIdempotencyKey({
          eventId,
          payloadFingerprint: preview.mapping.payloadFingerprint!,
          organizationId: env.organizationId,
          mappingVersion: preview.mapping.version,
        })
      : buildUpdateIdempotencyKey({
          eventId,
          remoteEventId: ref!.externalObjectId,
          payloadFingerprint: preview.mapping.payloadFingerprint!,
          organizationId: env.organizationId,
          baseFingerprint: publication.lastSyncedBaseFingerprint ?? "none",
        });

  const existingAttempt = await findAttemptByIdempotencyKey(idempotencyKey);
  if (existingAttempt?.status === "SUCCEEDED" && existingAttempt.remoteObjectId) {
    return {
      status: "ALREADY_PUBLISHED" as const,
      remoteObjectId: existingAttempt.remoteObjectId,
      attemptId: existingAttempt.id,
      isolation: assertMobilizePublishingIsolation(),
    };
  }
  if (existingAttempt?.status === "UNKNOWN_OUTCOME") {
    throw new AppError({
      code: "CONFLICT",
      status: 409,
      publicMessage:
        "A prior create attempt has unknown remote outcome — refresh/reconcile before retrying.",
    });
  }
  if (existingAttempt?.status === "STARTED") {
    throw new AppError({
      code: "CONFLICT",
      status: 409,
      publicMessage: "A publish attempt is already in progress for this idempotency key.",
    });
  }

  await upsertPublicationDraft({
    eventId,
    mappingVersion: preview.mapping.version,
    localFingerprint: preview.mapping.localFingerprint,
    proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
    targetOrganizationId: env.organizationId,
    status: "PUBLISHING",
    actorUserId: actor.userId,
  });

  let attempt;
  try {
    attempt = await createPublicationAttempt({
      publicationId: publication.id,
      actionType: action,
      idempotencyKey,
      actorUserId: actor.userId,
      mappingVersion: preview.mapping.version,
      requestCorrelationId: `pub-${eventId}-${Date.now()}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(msg)) {
      throw new AppError({
        code: "CONFLICT",
        status: 409,
        publicMessage: "Concurrent publish blocked by idempotency key.",
      });
    }
    throw err;
  }

  const adapter = new MobilizeAdapter({
    apiKey: env.apiKey,
    apiBaseUrl: env.apiBaseUrl,
    organizationId: env.organizationId,
    correlationId: attempt.requestCorrelationId ?? undefined,
  });

  try {
    let remote;
    if (action === "CREATE") {
      remote = await adapter.createOrganizationEvent(preview.mapping.document);
    } else {
      // Fetch remote first for three-way safety
      const currentRemote = await adapter.getOrganizationEvent(ref!.externalObjectId);
      if (!currentRemote) {
        await completePublicationAttempt(attempt.id, {
          status: "FAILED",
          errorCategory: "REMOTE_DELETED",
          redactedSummary: "Remote event missing before update.",
        });
        await upsertPublicationDraft({
          eventId,
          mappingVersion: preview.mapping.version,
          localFingerprint: preview.mapping.localFingerprint,
          proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
          targetOrganizationId: env.organizationId,
          status: "REMOTE_DELETED",
          actorUserId: actor.userId,
          remoteOutcome: "FAILED",
        });
        throw new ValidationError(
          "Remote Mobilize event was deleted — local Event preserved.",
        );
      }
      const timeslotCheck = reconcileTimeslots({
        local: (
          preview.eligibility.mappingPreview?.document?.timeslots ?? []
        ).map((t) => ({
          localKey: t.localKey,
          start: t.start_date,
          end: t.end_date,
          remoteId: t.id != null ? String(t.id) : null,
        })),
        remote: currentRemote.timeslots.map((t) => ({
          id: t.id,
          start: t.startAt ? Math.floor(new Date(t.startAt).getTime() / 1000) : 0,
          end: t.endAt ? Math.floor(new Date(t.endAt).getTime() / 1000) : 0,
        })),
      });
      if (timeslotCheck.wouldDeleteRemoteOnlyIfOmitted.length > 0) {
        throw new ValidationError(
          `Update would delete remote-only timeslots: ${timeslotCheck.wouldDeleteRemoteOnlyIfOmitted.join(", ")}. Include them or resolve explicitly.`,
        );
      }
      const threeWay = compareThreeWayDocuments({
        base: publication.lastSyncedBaseFingerprint
          ? { fingerprint: publication.lastSyncedBaseFingerprint }
          : null,
        local: { title: preview.mapping.document.title },
        remote: { title: currentRemote.title },
        fields: ["title"],
      });
      if (
        threeWay.hasConflict &&
        publication.conflictState !== "RESOLVED_LOCAL" &&
        publication.conflictState !== "RESOLVED_REMOTE"
      ) {
        await upsertPublicationDraft({
          eventId,
          mappingVersion: preview.mapping.version,
          localFingerprint: preview.mapping.localFingerprint,
          proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
          targetOrganizationId: env.organizationId,
          status: "CONFLICT",
          actorUserId: actor.userId,
          conflictState: "DETECTED",
        });
        throw new ValidationError(
          "Three-way conflict detected — resolve explicitly before update.",
        );
      }
      remote = await adapter.updateOrganizationEvent(
        ref!.externalObjectId,
        preview.mapping.document,
      );
    }

    const outcome = classifyCreateOutcome({ remoteObjectId: remote.id });
    if (outcome.kind !== "SUCCESS") {
      throw new Error("Unexpected missing remote id after write.");
    }

    const externalRef = await upsertExternalEventReference({
      externalObjectId: remote.id,
      contentFingerprint: remote.fingerprint,
      remoteCreatedAt: remote.createdAt,
      remoteUpdatedAt: remote.modifiedAt,
      localObjectType: "Event",
      localObjectId: eventId,
      actorUserId: actor.userId,
      now: new Date(),
    });

    await completePublicationAttempt(attempt.id, {
      status: "SUCCEEDED",
      remoteObjectId: remote.id,
      responseClass: "OK",
      redactedSummary: `Published Mobilize event ${remote.id}`,
    });
    await consumeApproval(approval.id);
    await upsertPublicationDraft({
      eventId,
      mappingVersion: preview.mapping.version,
      localFingerprint: preview.mapping.localFingerprint,
      proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
      targetOrganizationId: env.organizationId,
      status: "PUBLISHED",
      actorUserId: actor.userId,
      remoteOutcome: "SUCCESS",
      externalObjectReferenceId: externalRef.id,
      lastSyncedBaseFingerprint: remote.fingerprint,
      remoteFingerprint: remote.fingerprint,
      lastPublishedAt: new Date(),
      mobilizeBrowserUrl: null,
    });

    await writeAttributedAudit({
      actor,
      action:
        action === "CREATE"
          ? "mobilize.publication.create.success"
          : "mobilize.publication.update.success",
      entityType: "ExternalPublication",
      entityId: publication.id,
      metadata: {
        eventId,
        remoteObjectId: remote.id,
        mappingVersion: preview.mapping.version,
      },
    });

    return {
      status: "PUBLISHED" as const,
      remoteObjectId: remote.id,
      attemptId: attempt.id,
      timeslots: remote.timeslots.map((t) => t.id),
      isolation: assertMobilizePublishingIsolation(),
      missionCreated: false,
    };
  } catch (err) {
    const category =
      err instanceof MobilizeTransportError ? err.category : "UNKNOWN";
    const outcome = classifyCreateOutcome({
      errorCategory: category,
      remoteObjectId: null,
    });
    await completePublicationAttempt(attempt.id, {
      status:
        outcome.kind === "UNKNOWN_REMOTE_OUTCOME"
          ? "UNKNOWN_OUTCOME"
          : "FAILED",
      errorCategory: category,
      unknownOutcome: outcome.kind === "UNKNOWN_REMOTE_OUTCOME",
      redactedSummary:
        err instanceof Error ? err.message.slice(0, 200) : "Publish failed",
    });
    await upsertPublicationDraft({
      eventId,
      mappingVersion: preview.mapping.version,
      localFingerprint: preview.mapping.localFingerprint,
      proposedPayloadFingerprint: preview.mapping.payloadFingerprint,
      targetOrganizationId: env.organizationId,
      status:
        outcome.kind === "UNKNOWN_REMOTE_OUTCOME"
          ? "UNKNOWN_REMOTE_OUTCOME"
          : "FAILED",
      actorUserId: actor.userId,
      remoteOutcome:
        outcome.kind === "UNKNOWN_REMOTE_OUTCOME" ? "UNKNOWN" : "FAILED",
    });
    await writeAttributedAudit({
      actor,
      action: "mobilize.publication.failed",
      entityType: "ExternalPublicationAttempt",
      entityId: attempt.id,
      metadata: { eventId, category, outcome: outcome.kind },
    });
    if (err instanceof AppError || err instanceof ValidationError) throw err;
    throw new AppError({
      code:
        outcome.kind === "UNKNOWN_REMOTE_OUTCOME"
          ? "CONFLICT"
          : "EXTERNAL_SERVICE_ERROR",
      status: outcome.kind === "UNKNOWN_REMOTE_OUTCOME" ? 409 : 502,
      publicMessage:
        outcome.kind === "UNKNOWN_REMOTE_OUTCOME"
          ? outcome.message
          : "Mobilize publish failed.",
    });
  }
}

export async function refreshMobilizeRemoteState(
  actor: AuthenticatedActor,
  eventId: string,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.apiKey || !env.organizationId) {
    return {
      state: "NOT_CONFIGURED" as const,
      message: "Credentials required to refresh remote state.",
      isolation: assertMobilizePublishingIsolation(),
    };
  }
  const ref = await findMobilizeEventReference(eventId);
  if (!ref) {
    throw new ValidationError("No Mobilize reference linked to this Event.");
  }
  const adapter = new MobilizeAdapter({
    apiKey: env.apiKey,
    apiBaseUrl: env.apiBaseUrl,
    organizationId: env.organizationId,
  });
  const remote = await adapter.getOrganizationEvent(ref.externalObjectId);
  const publication = await findPublicationByEventId(eventId);
  if (!remote) {
    if (publication) {
      await upsertPublicationDraft({
        eventId,
        mappingVersion: publication.mappingVersion,
        localFingerprint: publication.localFingerprint ?? "",
        proposedPayloadFingerprint: publication.proposedPayloadFingerprint,
        targetOrganizationId: env.organizationId,
        status: "REMOTE_DELETED",
        actorUserId: actor.userId,
        remoteOutcome: "FAILED",
      });
    }
    return {
      state: "REMOTE_DELETED" as const,
      localEventPreserved: true,
      isolation: assertMobilizePublishingIsolation(),
    };
  }
  const localChanged =
    publication?.localFingerprint &&
    publication.lastSyncedBaseFingerprint &&
    publication.localFingerprint !== publication.lastSyncedBaseFingerprint;
  const remoteChanged =
    publication?.remoteFingerprint &&
    publication.remoteFingerprint !== remote.fingerprint;
  let status:
    | "RECONCILED"
    | "LOCALLY_CHANGED"
    | "REMOTELY_CHANGED"
    | "CONFLICT" = "RECONCILED";
  if (localChanged && remoteChanged) status = "CONFLICT";
  else if (localChanged) status = "LOCALLY_CHANGED";
  else if (remoteChanged) status = "REMOTELY_CHANGED";

  if (publication) {
    await upsertPublicationDraft({
      eventId,
      mappingVersion: publication.mappingVersion,
      localFingerprint: publication.localFingerprint ?? "",
      proposedPayloadFingerprint: publication.proposedPayloadFingerprint,
      targetOrganizationId: env.organizationId,
      status,
      actorUserId: actor.userId,
      remoteFingerprint: remote.fingerprint,
      conflictState: status === "CONFLICT" ? "MANUAL_REQUIRED" : "NONE",
      lastSyncedBaseFingerprint: publication.lastSyncedBaseFingerprint,
    });
  }
  await writeAttributedAudit({
    actor,
    action: "mobilize.publication.refresh",
    entityType: "Event",
    entityId: eventId,
    metadata: { remoteObjectId: remote.id, status },
  });
  return {
    state: status,
    remote: {
      id: remote.id,
      title: remote.title,
      modifiedAt: remote.modifiedAt,
      timeslotIds: remote.timeslots.map((t) => t.id),
    },
    isolation: assertMobilizePublishingIsolation(),
  };
}

export async function resolveMobilizePublicationConflict(
  actor: AuthenticatedActor,
  eventId: string,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const publication = await findPublicationByEventId(eventId);
  if (!publication) throw new ValidationError("Publication not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const resolution = b.resolution;
  if (
    resolution !== "KEEP_LOCAL" &&
    resolution !== "KEEP_REMOTE" &&
    resolution !== "MANUAL"
  ) {
    throw new ValidationError(
      "resolution must be KEEP_LOCAL, KEEP_REMOTE, or MANUAL.",
    );
  }
  await upsertPublicationDraft({
    eventId,
    mappingVersion: publication.mappingVersion,
    localFingerprint: publication.localFingerprint ?? "",
    proposedPayloadFingerprint: publication.proposedPayloadFingerprint,
    targetOrganizationId: publication.targetOrganizationId,
    status: "RECONCILED",
    actorUserId: actor.userId,
    conflictState:
      resolution === "KEEP_REMOTE" ? "RESOLVED_REMOTE" : "RESOLVED_LOCAL",
  });
  await writeAttributedAudit({
    actor,
    action: "mobilize.publication.conflict.resolve",
    entityType: "ExternalPublication",
    entityId: publication.id,
    metadata: { eventId, resolution },
  });
  return {
    status: "RECONCILED" as const,
    resolution,
    note: "Explicit resolution recorded — last-write-wins was not used.",
    isolation: assertMobilizePublishingIsolation(),
  };
}

/** Guarded delete — disabled unless MOBILIZE_DELETE_ENABLED and credentials. */
export async function deleteMobilizeRemoteEvent(
  actor: AuthenticatedActor,
  eventId: string,
  body: unknown,
) {
  assertMobilizeIntegrationAdmin(actor);
  const env = getMobilizeIntegrationEnv();
  if (!env.deleteEnabled) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage:
        "Remote Mobilize deletion is disabled by default in D17.",
    });
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  if (b.confirmation !== "DELETE_REMOTE_MOBILIZE_EVENT") {
    throw new ValidationError(
      'Typed confirmation DELETE_REMOTE_MOBILIZE_EVENT is required.',
    );
  }
  if (!env.apiKey || !env.organizationId) {
    throw new ValidationError("Credentials required.");
  }
  const ref = await findMobilizeEventReference(eventId);
  if (!ref) throw new ValidationError("No remote reference.");
  // Intentionally still blocked in production D17 unless operator explicitly enables flag.
  // Live delete remains off by default.
  throw new AppError({
    code: "NOT_IMPLEMENTED",
    status: 403,
    publicMessage:
      "Remote delete remains blocked for D17 production until credential-tested validation is approved.",
  });
}
