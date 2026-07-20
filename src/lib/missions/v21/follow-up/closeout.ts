import type { MissionFollowUpRecord } from "@/lib/missions/v21/follow-up/types";
import { campaignDateKey } from "@/lib/missions/v21/follow-up/labels";

export type CloseoutCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export function buildCloseoutChecklist(
  record: MissionFollowUpRecord,
  options: {
    debriefApproved: boolean;
    now: Date;
    campaignTimezone: string;
  },
): CloseoutCheck[] {
  const actions = record.actions;
  const active = actions.filter(
    (a) => a.status !== "COMPLETED" && a.status !== "CANCELLED",
  );
  const today = campaignDateKey(options.now, options.campaignTimezone);

  const noOpen = !active.some(
    (a) => a.status === "OPEN" || a.status === "IN_PROGRESS",
  );
  const noBlocked = !active.some((a) => a.status === "BLOCKED");
  const noOverdue = !active.some(
    (a) => a.dueAt && campaignDateKey(new Date(a.dueAt), options.campaignTimezone) < today,
  );
  const commitmentsOk = actions
    .filter((a) => a.sourceType === "EXECUTE_COMMITMENT")
    .every(
      (a) =>
        a.status === "COMPLETED" ||
        (a.status === "CANCELLED" && Boolean(a.cancellationReason?.trim())),
    );
  const materialCompletedHaveSummary = actions
    .filter(
      (a) =>
        a.status === "COMPLETED" &&
        (a.sourceType === "EXECUTE_COMMITMENT" ||
          a.sourceType === "EXECUTE_IMMEDIATE_FOLLOW_UP"),
    )
    .every((a) => Boolean(a.completionSummary?.trim()));
  const cancelledHaveReason = actions
    .filter((a) => a.status === "CANCELLED")
    .every((a) => Boolean(a.cancellationReason?.trim()));
  const noUnassignedRequired = !active.some(
    (a) => a.ownerType === "UNASSIGNED",
  );
  const waitingDocumented = active
    .filter((a) => a.status === "WAITING")
    .every(
      (a) =>
        Boolean(a.waitingReason?.trim()) &&
        Boolean(a.nextCheckAt) &&
        Boolean(a.ownerType !== "UNASSIGNED"),
    );
  // Waiting items with future check can remain if documented; they still block
  // ready-to-close unless none remain or all waiting are documented AND
  // unresolvedSummary present. Spec: waiting may prevent closeout unless deferred.
  const waitingOk =
    !active.some((a) => a.status === "WAITING") ||
    (waitingDocumented && Boolean(record.unresolvedSummary?.trim()));

  return [
    {
      id: "debrief",
      label: "Debrief approved",
      ok: options.debriefApproved,
    },
    {
      id: "noOpen",
      label: "No open or in-progress required actions",
      ok: noOpen,
    },
    {
      id: "noBlocked",
      label: "No unresolved blocked actions",
      ok: noBlocked,
    },
    {
      id: "noOverdue",
      label: "No overdue required actions",
      ok: noOverdue,
    },
    {
      id: "commitments",
      label: "Commitments completed or cancelled with reason",
      ok: commitmentsOk,
    },
    {
      id: "evidence",
      label: "Material completions have summaries",
      ok: materialCompletedHaveSummary,
    },
    {
      id: "cancelReasons",
      label: "Cancellations have reasons",
      ok: cancelledHaveReason,
    },
    {
      id: "owners",
      label: "No unassigned required actions",
      ok: noUnassignedRequired,
    },
    {
      id: "waiting",
      label: "Waiting work documented or cleared",
      ok: waitingOk,
    },
    {
      id: "summary",
      label: "Closeout summary present",
      ok: Boolean(record.closeoutSummary?.trim()),
    },
  ];
}

export function canMarkReadyToClose(
  record: MissionFollowUpRecord,
  options: {
    debriefApproved: boolean;
    now: Date;
    campaignTimezone: string;
  },
): { ok: true } | { ok: false; message: string } {
  const checks = buildCloseoutChecklist(record, options);
  const missing = checks.filter((c) => !c.ok).map((c) => c.id);
  if (missing.length) {
    return {
      ok: false,
      message: `Not ready to close. Missing: ${missing.join(", ")}.`,
    };
  }
  return { ok: true };
}

export function canCloseMission(
  record: MissionFollowUpRecord,
  debriefApproved: boolean,
): { ok: true } | { ok: false; message: string } {
  if (!debriefApproved) {
    return { ok: false, message: "Debrief must be approved before closeout." };
  }
  if (record.followUpStatus !== "READY_TO_CLOSE") {
    return {
      ok: false,
      message: "Follow-up must be marked Ready to Close before closing.",
    };
  }
  if (!record.closeoutSummary?.trim()) {
    return { ok: false, message: "Closeout summary is required." };
  }
  return { ok: true };
}
