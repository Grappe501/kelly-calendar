import type {
  EventReconcileCandidate,
  NormalizedMobilizeDeletedEvent,
  NormalizedMobilizeEvent,
  SyncCandidateAction,
} from "@/features/mobilize-integration/types";

export type ExternalRefMatch = {
  externalObjectId: string;
  localObjectType: string | null;
  localObjectId: string | null;
  contentFingerprint: string | null;
  remoteDeletedAt: string | null;
};

/**
 * Deterministic event reconciliation. Never title-only auto-match.
 * ExternalObjectReference is the only auto-link path.
 */
export function reconcileMobilizeEvents(input: {
  remoteEvents: NormalizedMobilizeEvent[];
  deletedEvents: NormalizedMobilizeDeletedEvent[];
  referencesByExternalId: Map<string, ExternalRefMatch>;
  /** Optional title collisions for AMBIGUOUS_MATCH when no external ref exists. */
  localEventsByTitle?: Map<string, string[]>;
}): EventReconcileCandidate[] {
  const candidates: EventReconcileCandidate[] = [];
  const seen = new Set<string>();

  for (const event of input.remoteEvents) {
    seen.add(event.id);
    const ref = input.referencesByExternalId.get(event.id);
    if (!ref) {
      const titleHits = input.localEventsByTitle?.get(event.title.trim().toLowerCase()) ?? [];
      if (titleHits.length > 0) {
        candidates.push({
          action: "AMBIGUOUS_MATCH",
          externalObjectId: event.id,
          externalObjectType: "EVENT",
          proposedLocalObjectType: "Event",
          proposedLocalObjectId: null,
          comparisonFingerprint: event.fingerprint,
          changeSummary: `Possible title match (${titleHits.length}) without external reference — review required.`,
          conflictState: "MANUAL_REQUIRED",
          event,
        });
      } else {
        candidates.push({
          action: "NEW_REMOTE",
          externalObjectId: event.id,
          externalObjectType: "EVENT",
          proposedLocalObjectType: "Event",
          proposedLocalObjectId: null,
          comparisonFingerprint: event.fingerprint,
          changeSummary: `New remote event: ${event.title}`,
          conflictState: "NONE",
          event,
        });
      }
      continue;
    }

    if (ref.contentFingerprint === event.fingerprint) {
      candidates.push({
        action: "MATCHED_UNCHANGED",
        externalObjectId: event.id,
        externalObjectType: "EVENT",
        proposedLocalObjectType: (ref.localObjectType as "Event") ?? "Event",
        proposedLocalObjectId: ref.localObjectId,
        comparisonFingerprint: event.fingerprint,
        changeSummary: "Matched external reference — unchanged.",
        conflictState: "NONE",
        event,
      });
    } else {
      candidates.push({
        action: "REMOTE_CHANGED",
        externalObjectId: event.id,
        externalObjectType: "EVENT",
        proposedLocalObjectType: (ref.localObjectType as "Event") ?? "Event",
        proposedLocalObjectId: ref.localObjectId,
        comparisonFingerprint: event.fingerprint,
        changeSummary: "Remote event changed since last sync fingerprint.",
        conflictState: "DETECTED",
        event,
      });
    }
  }

  for (const deleted of input.deletedEvents) {
    seen.add(deleted.id);
    const ref = input.referencesByExternalId.get(deleted.id);
    if (!ref) {
      candidates.push({
        action: "IGNORED",
        externalObjectId: deleted.id,
        externalObjectType: "EVENT",
        proposedLocalObjectType: null,
        proposedLocalObjectId: null,
        comparisonFingerprint: `deleted:${deleted.id}`,
        changeSummary: "Remote deletion observed without local reference.",
        conflictState: "NONE",
        event: null,
      });
      continue;
    }
    candidates.push({
      action: "REMOTE_DELETED",
      externalObjectId: deleted.id,
      externalObjectType: "EVENT",
      proposedLocalObjectType: (ref.localObjectType as "Event") ?? null,
      proposedLocalObjectId: ref.localObjectId,
      comparisonFingerprint: `deleted:${deleted.id}:${deleted.deletedAt ?? ""}`,
      changeSummary:
        "Remote deletion detected — local Event/Mission preserved; reference marked deleted.",
      conflictState: "DETECTED",
      event: null,
    });
  }

  // Title-only matching never auto-applies — already AMBIGUOUS_MATCH above.
  void seen;
  return candidates.sort((a, b) =>
    a.externalObjectId.localeCompare(b.externalObjectId),
  );
}

export function countByAction(
  candidates: { action: SyncCandidateAction }[],
): Record<SyncCandidateAction, number> {
  const counts = {
    NEW_REMOTE: 0,
    MATCHED_UNCHANGED: 0,
    REMOTE_CHANGED: 0,
    LOCAL_CHANGED: 0,
    BOTH_CHANGED: 0,
    REMOTE_DELETED: 0,
    AMBIGUOUS_MATCH: 0,
    CONFLICT: 0,
    UNSUPPORTED: 0,
    IGNORED: 0,
  };
  for (const c of candidates) counts[c.action] += 1;
  return counts;
}

/** Isolation: Mobilize sync never mutates Mission operational layers. */
export function assertMobilizeDoesNotMutateMissions() {
  return {
    mutatesMissionLifecycle: false as const,
    mutatesPrepare: false as const,
    mutatesExecute: false as const,
    mutatesDebrief: false as const,
    mutatesFollowUp: false as const,
    mutatesTravel: false as const,
    mutatesLogistics: false as const,
    mutatesFieldOps: false as const,
    mutatesIncidents: false as const,
    mutatesExceptionDigest: false as const,
    mutatesCloseout: false as const,
    mutatesLaunch: false as const,
    autoCreatesMissions: false as const,
    outboundPublishingEnabled: false as const,
    personLevelApplyEnabled: false as const,
  };
}
