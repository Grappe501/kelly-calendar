/**
 * CC-09 bulk operations — pure contracts and bounds.
 */
export const BULK_MAX_ITEMS = 50;
export const BULK_PREVIEW_TTL_MS = 30 * 60 * 1000;
export const BULK_CAMPAIGN_KEY = "kelly";

export type BulkActionType =
  | "ARCHIVE"
  | "RESTORE"
  | "CANCEL"
  | "ADD_CALENDAR"
  | "REMOVE_CALENDAR";

export type BulkItemEligibility =
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "ALREADY_COMPLETE"
  | "REQUIRES_INDIVIDUAL_REVIEW"
  | "STALE"
  | "UNAUTHORIZED";

export const RECOVERABLE_ACTIONS: ReadonlySet<BulkActionType> = new Set([
  "ARCHIVE",
  "ADD_CALENDAR",
  "REMOVE_CALENDAR",
]);

export function inverseBulkAction(action: BulkActionType): BulkActionType | null {
  switch (action) {
    case "ARCHIVE":
      return "RESTORE";
    case "ADD_CALENDAR":
      return "REMOVE_CALENDAR";
    case "REMOVE_CALENDAR":
      return "ADD_CALENDAR";
    default:
      return null;
  }
}
