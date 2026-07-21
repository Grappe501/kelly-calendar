/**
 * Persistence EventStatus transition rules for Step 11.
 * Operator lifecycle remains derived via deriveEventOperationalLifecycle.
 * Build: KCCC-EA-11-EVENT-CREATION-EDITING-1.0
 */

import type { EventPersistenceStatus } from "@/lib/calendar/canonical-event";

/** Allowed next statuses from each persistence status (explicit cancel/archive included). */
export const EVENT_STATUS_TRANSITIONS: Record<
  EventPersistenceStatus,
  readonly EventPersistenceStatus[]
> = {
  DRAFT: [
    "DRAFT",
    "REQUESTED",
    "TENTATIVE",
    "HOLD",
    "UNDER_REVIEW",
    "APPROVED",
    "CONFIRMED",
    "CANCELLED",
    "ARCHIVED",
  ],
  REQUESTED: [
    "REQUESTED",
    "DRAFT",
    "TENTATIVE",
    "HOLD",
    "UNDER_REVIEW",
    "APPROVED",
    "CONFIRMED",
    "DECLINED",
    "CANCELLED",
    "ARCHIVED",
  ],
  TENTATIVE: [
    "TENTATIVE",
    "HOLD",
    "UNDER_REVIEW",
    "APPROVED",
    "CONFIRMED",
    "POSTPONED",
    "CANCELLED",
    "DRAFT",
    "ARCHIVED",
  ],
  HOLD: [
    "HOLD",
    "TENTATIVE",
    "UNDER_REVIEW",
    "APPROVED",
    "CONFIRMED",
    "POSTPONED",
    "CANCELLED",
    "DRAFT",
    "ARCHIVED",
  ],
  UNDER_REVIEW: [
    "UNDER_REVIEW",
    "APPROVED",
    "CONFIRMED",
    "TENTATIVE",
    "HOLD",
    "DECLINED",
    "CANCELLED",
    "ARCHIVED",
  ],
  APPROVED: [
    "APPROVED",
    "CONFIRMED",
    "IN_PROGRESS",
    "POSTPONED",
    "CANCELLED",
    "ARCHIVED",
  ],
  CONFIRMED: [
    "CONFIRMED",
    "IN_PROGRESS",
    "POSTPONED",
    "CANCELLED",
    "COMPLETED",
    "ARCHIVED",
  ],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED", "ARCHIVED"],
  COMPLETED: ["COMPLETED", "ARCHIVED"],
  CANCELLED: ["CANCELLED", "DRAFT", "TENTATIVE", "CONFIRMED", "ARCHIVED"],
  DECLINED: ["DECLINED", "DRAFT", "REQUESTED", "ARCHIVED"],
  POSTPONED: [
    "POSTPONED",
    "TENTATIVE",
    "HOLD",
    "CONFIRMED",
    "CANCELLED",
    "ARCHIVED",
  ],
  ARCHIVED: ["ARCHIVED"],
};

export function canTransitionEventStatus(
  from: EventPersistenceStatus,
  to: EventPersistenceStatus,
): boolean {
  if (from === to) return true;
  return (EVENT_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function assertEventStatusTransition(
  from: EventPersistenceStatus,
  to: EventPersistenceStatus,
): void {
  if (!canTransitionEventStatus(from, to)) {
    throw new Error(`Invalid event status transition: ${from} → ${to}`);
  }
}

/** Publish / schedule from draft-like states. */
export const PUBLISH_TARGET_STATUSES = [
  "TENTATIVE",
  "HOLD",
  "CONFIRMED",
] as const satisfies readonly EventPersistenceStatus[];
