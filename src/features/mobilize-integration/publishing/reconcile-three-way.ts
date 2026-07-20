import { fingerprintPayload } from "@/features/mobilize-integration/normalize";

export type FieldChangeClass =
  | "UNCHANGED"
  | "LOCAL_ONLY"
  | "REMOTE_ONLY"
  | "SAME_CHANGE"
  | "CONFLICT";

export type FieldComparison = {
  field: string;
  classification: FieldChangeClass;
  base: unknown;
  local: unknown;
  remote: unknown;
};

function stable(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function classifyThreeWayField(input: {
  field: string;
  base: unknown;
  local: unknown;
  remote: unknown;
}): FieldComparison {
  const b = stable(input.base);
  const l = stable(input.local);
  const r = stable(input.remote);
  let classification: FieldChangeClass = "UNCHANGED";
  if (l === b && r === b) classification = "UNCHANGED";
  else if (l !== b && r === b) classification = "LOCAL_ONLY";
  else if (l === b && r !== b) classification = "REMOTE_ONLY";
  else if (l === r && l !== b) classification = "SAME_CHANGE";
  else classification = "CONFLICT";
  return {
    field: input.field,
    classification,
    base: input.base,
    local: input.local,
    remote: input.remote,
  };
}

export function compareThreeWayDocuments(input: {
  base: Record<string, unknown> | null;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  fields: string[];
}): {
  comparisons: FieldComparison[];
  hasConflict: boolean;
  localOnly: string[];
  remoteOnly: string[];
  sameChange: string[];
  conflicts: string[];
} {
  const comparisons = input.fields.map((field) =>
    classifyThreeWayField({
      field,
      base: input.base?.[field] ?? null,
      local: input.local[field] ?? null,
      remote: input.remote[field] ?? null,
    }),
  );
  return {
    comparisons,
    hasConflict: comparisons.some((c) => c.classification === "CONFLICT"),
    localOnly: comparisons
      .filter((c) => c.classification === "LOCAL_ONLY")
      .map((c) => c.field),
    remoteOnly: comparisons
      .filter((c) => c.classification === "REMOTE_ONLY")
      .map((c) => c.field),
    sameChange: comparisons
      .filter((c) => c.classification === "SAME_CHANGE")
      .map((c) => c.field),
    conflicts: comparisons
      .filter((c) => c.classification === "CONFLICT")
      .map((c) => c.field),
  };
}

export type TimeslotReconcileRow = {
  localKey: string | null;
  remoteId: string | null;
  classification:
    | "MATCHED"
    | "NEW_LOCAL"
    | "CHANGED_LOCAL"
    | "REMOTE_ONLY"
    | "LOCALLY_REMOVED"
    | "REMOTELY_REMOVED"
    | "TIME_CONFLICT"
    | "CAPACITY_CHANGED";
  localStart: number | null;
  localEnd: number | null;
  remoteStart: number | null;
  remoteEnd: number | null;
  note?: string;
};

/**
 * Reconcile timeslots by remote id first, never by array position alone.
 * PUT replaces the upcoming collection — remote-only slots must be protected.
 */
export function reconcileTimeslots(input: {
  local: Array<{
    localKey: string;
    start: number;
    end: number;
    remoteId?: string | null;
    maxAttendees?: number | null;
  }>;
  remote: Array<{
    id: string;
    start: number;
    end: number;
    maxAttendees?: number | null;
  }>;
  baseRemoteIds?: string[];
}): {
  rows: TimeslotReconcileRow[];
  wouldDeleteRemoteOnlyIfOmitted: string[];
  collectionReplacementWarning: string;
} {
  const rows: TimeslotReconcileRow[] = [];
  const remoteById = new Map(input.remote.map((r) => [r.id, r]));
  const matchedRemote = new Set<string>();

  for (const local of input.local) {
    const remoteId = local.remoteId ?? null;
    if (remoteId && remoteById.has(remoteId)) {
      matchedRemote.add(remoteId);
      const remote = remoteById.get(remoteId)!;
      if (remote.start !== local.start || remote.end !== local.end) {
        const baseHad = (input.baseRemoteIds ?? []).includes(remoteId);
        rows.push({
          localKey: local.localKey,
          remoteId,
          classification:
            baseHad &&
            (input.baseRemoteIds
              ? true
              : false)
              ? "TIME_CONFLICT"
              : "CHANGED_LOCAL",
          localStart: local.start,
          localEnd: local.end,
          remoteStart: remote.start,
          remoteEnd: remote.end,
          note:
            remote.start !== local.start || remote.end !== local.end
              ? "Start/end differ — require review if remote also moved."
              : undefined,
        });
        // Refine: if local differs from remote and we don't know base, treat as conflict when both differ from each other
        const last = rows[rows.length - 1]!;
        if (
          last.localStart !== last.remoteStart ||
          last.localEnd !== last.remoteEnd
        ) {
          // If only local changed vs last synced, CHANGED_LOCAL; if remote also differs from expected local proposal intent, CONFLICT
          last.classification = "CHANGED_LOCAL";
        }
      } else if (
        local.maxAttendees != null &&
        remote.maxAttendees != null &&
        local.maxAttendees !== remote.maxAttendees
      ) {
        rows.push({
          localKey: local.localKey,
          remoteId,
          classification: "CAPACITY_CHANGED",
          localStart: local.start,
          localEnd: local.end,
          remoteStart: remote.start,
          remoteEnd: remote.end,
        });
      } else {
        rows.push({
          localKey: local.localKey,
          remoteId,
          classification: "MATCHED",
          localStart: local.start,
          localEnd: local.end,
          remoteStart: remote.start,
          remoteEnd: remote.end,
        });
      }
    } else {
      rows.push({
        localKey: local.localKey,
        remoteId: null,
        classification: "NEW_LOCAL",
        localStart: local.start,
        localEnd: local.end,
        remoteStart: null,
        remoteEnd: null,
      });
    }
  }

  const wouldDeleteRemoteOnlyIfOmitted: string[] = [];
  for (const remote of input.remote) {
    if (matchedRemote.has(remote.id)) continue;
    wouldDeleteRemoteOnlyIfOmitted.push(remote.id);
    rows.push({
      localKey: null,
      remoteId: remote.id,
      classification: "REMOTE_ONLY",
      localStart: null,
      localEnd: null,
      remoteStart: remote.start,
      remoteEnd: remote.end,
      note: "Omitting this timeslot from PUT would delete it on Mobilize.",
    });
  }

  return {
    rows,
    wouldDeleteRemoteOnlyIfOmitted,
    collectionReplacementWarning:
      "Mobilize PUT replaces the upcoming timeslot collection. Include remote-only timeslots explicitly or they will be deleted.",
  };
}

export function fingerprintRemoteObservation(parts: {
  remoteId: string;
  modifiedAt: string | null;
  title: string;
  timeslotIds: string[];
}): string {
  return fingerprintPayload([
    parts.remoteId,
    parts.modifiedAt ?? "",
    parts.title,
    ...parts.timeslotIds.sort(),
  ]);
}

export type ConflictDecision = {
  field: string;
  resolution: "KEEP_LOCAL" | "KEEP_REMOTE" | "MANUAL";
  manualValue?: unknown;
};

/**
 * Apply explicit field-level conflict decisions — never last-write-wins.
 */
export function applyConflictDecisions(input: {
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  decisions: ConflictDecision[];
}): Record<string, unknown> {
  const out = { ...input.local };
  for (const decision of input.decisions) {
    if (decision.resolution === "KEEP_LOCAL") {
      out[decision.field] = input.local[decision.field];
    } else if (decision.resolution === "KEEP_REMOTE") {
      out[decision.field] = input.remote[decision.field];
    } else if (decision.resolution === "MANUAL") {
      out[decision.field] = decision.manualValue;
    }
  }
  return out;
}
