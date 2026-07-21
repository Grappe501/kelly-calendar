type TransitionResult = { ok: boolean; next: string | null; reason?: string };

const CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["CONFIGURING", "READY_FOR_REVIEW", "CANCELLED", "ARCHIVED"],
  CONFIGURING: ["READY_FOR_REVIEW", "DRAFT", "CANCELLED"],
  READY_FOR_REVIEW: ["APPROVED", "CONFIGURING", "CANCELLED"],
  APPROVED: ["SCHEDULED", "READY_TO_LAUNCH", "CANCELLED"],
  SCHEDULED: ["READY_TO_LAUNCH", "CANCELLED", "PAUSED"],
  READY_TO_LAUNCH: ["RUNNING", "PAUSED", "CANCELLED"],
  RUNNING: ["PAUSED", "COMPLETED", "COMPLETED_WITH_WARNINGS", "CANCELLED", "FAILED"],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  COMPLETED: ["ARCHIVED"],
  COMPLETED_WITH_WARNINGS: ["ARCHIVED"],
  CANCELLED: ["ARCHIVED"],
  FAILED: ["ARCHIVED", "CANCELLED"],
  ARCHIVED: [],
};

const RUN_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["READY", "CANCELLED", "EXPIRED"],
  READY: ["STARTING", "CANCELLED", "EXPIRED"],
  STARTING: ["RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["PAUSING", "COMPLETING", "FAILED", "CANCELLING"],
  PAUSING: ["PAUSED", "RUNNING"],
  PAUSED: ["RESUMING", "CANCELLING", "FAILED", "EXPIRED"],
  RESUMING: ["RUNNING", "PAUSED", "FAILED"],
  COMPLETING: ["COMPLETED", "COMPLETED_WITH_WARNINGS", "FAILED"],
  COMPLETED: [],
  COMPLETED_WITH_WARNINGS: [],
  CANCELLING: ["CANCELLED"],
  CANCELLED: [],
  FAILED: [],
  EXPIRED: [],
};

const BATCH_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["READY", "CANCELLED"],
  READY: ["RUNNING", "CANCELLED", "PAUSED"],
  RUNNING: ["COMPLETED", "COMPLETED_WITH_WARNINGS", "PAUSED", "FAILED", "CANCELLED"],
  PAUSED: ["READY", "CANCELLED", "FAILED"],
  COMPLETED: [],
  COMPLETED_WITH_WARNINGS: [],
  CANCELLED: [],
  FAILED: [],
};

function transition(
  map: Record<string, string[]>,
  current: string,
  next: string,
): TransitionResult {
  const allowed = map[current] ?? [];
  if (!allowed.includes(next)) {
    return { ok: false, next: null, reason: `INVALID_TRANSITION:${current}->${next}` };
  }
  return { ok: true, next };
}

export function transitionCampaignStatus(
  current: string,
  next: string,
): TransitionResult {
  return transition(CAMPAIGN_TRANSITIONS, current, next);
}

export function transitionRunStatus(
  current: string,
  next: string,
): TransitionResult {
  return transition(RUN_TRANSITIONS, current, next);
}

export function transitionBatchStatus(
  current: string,
  next: string,
): TransitionResult {
  return transition(BATCH_TRANSITIONS, current, next);
}

export function canCreateNewBatches(runStatus: string): boolean {
  return runStatus === "RUNNING" || runStatus === "READY" || runStatus === "STARTING";
}

export function canDispatchBatch(runStatus: string, batchStatus: string): boolean {
  return (
    (runStatus === "RUNNING" || runStatus === "STARTING") &&
    (batchStatus === "READY" || batchStatus === "RUNNING")
  );
}
