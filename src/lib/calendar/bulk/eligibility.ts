import type { BulkActionType, BulkItemEligibility } from "./bounds";

export type BulkEligibilityInput = {
  actionType: BulkActionType;
  status: string;
  archivedAt: Date | null;
  isRecurring: boolean;
  recurrenceSeriesId: string | null;
  missionLinked: boolean;
  isImported: boolean;
  /** Series-wide cancel/archive requested — always review. */
  seriesScopeRequested?: boolean;
  canAccess: boolean;
  targetCalendarId?: string | null;
  isPrimaryCalendarTarget?: boolean;
  alreadyMemberOfTarget?: boolean;
};

export type BulkEligibilityResult = {
  eligibility: BulkItemEligibility;
  note: string | null;
  recoveryEligible: boolean;
};

/**
 * Pure eligibility classifier — no DB, no auth beyond canAccess flag.
 */
export function classifyBulkItem(input: BulkEligibilityInput): BulkEligibilityResult {
  if (!input.canAccess) {
    return {
      eligibility: "UNAUTHORIZED",
      note: "Viewer cannot access this Event.",
      recoveryEligible: false,
    };
  }

  if (input.seriesScopeRequested) {
    return {
      eligibility: "REQUIRES_INDIVIDUAL_REVIEW",
      note: "Entire-series scope requires individual review.",
      recoveryEligible: false,
    };
  }

  switch (input.actionType) {
    case "ARCHIVE": {
      if (input.archivedAt) {
        return {
          eligibility: "ALREADY_COMPLETE",
          note: "Already archived.",
          recoveryEligible: false,
        };
      }
      if (input.isRecurring && input.recurrenceSeriesId) {
        return {
          eligibility: "ELIGIBLE",
          note: "Recurring occurrence — archives this Event only, not the series.",
          recoveryEligible: true,
        };
      }
      return {
        eligibility: "ELIGIBLE",
        note: input.missionLinked
          ? "Mission-linked: Mission will not be cancelled."
          : null,
        recoveryEligible: true,
      };
    }
    case "RESTORE": {
      if (!input.archivedAt) {
        return {
          eligibility: "ALREADY_COMPLETE",
          note: "Not archived.",
          recoveryEligible: false,
        };
      }
      return {
        eligibility: "ELIGIBLE",
        note: "Restore returns Event to DRAFT per lifecycle doctrine.",
        recoveryEligible: false,
      };
    }
    case "CANCEL": {
      if (input.archivedAt) {
        return {
          eligibility: "INELIGIBLE",
          note: "Archived Events cannot be cancelled; restore first.",
          recoveryEligible: false,
        };
      }
      if (input.status === "CANCELLED") {
        return {
          eligibility: "ALREADY_COMPLETE",
          note: "Already cancelled.",
          recoveryEligible: false,
        };
      }
      if (input.isRecurring && input.recurrenceSeriesId) {
        return {
          eligibility: "ELIGIBLE",
          note: "Cancels this occurrence Event only — not the series.",
          recoveryEligible: false,
        };
      }
      return {
        eligibility: "ELIGIBLE",
        note: input.missionLinked
          ? "Mission-linked: Mission will not be cancelled."
          : input.isImported
            ? "Imported: local cancel does not write remotely."
            : null,
        recoveryEligible: false,
      };
    }
    case "ADD_CALENDAR": {
      if (!input.targetCalendarId) {
        return {
          eligibility: "INELIGIBLE",
          note: "Target calendar required.",
          recoveryEligible: false,
        };
      }
      if (input.archivedAt) {
        return {
          eligibility: "INELIGIBLE",
          note: "Cannot modify calendars on archived Events.",
          recoveryEligible: false,
        };
      }
      if (input.alreadyMemberOfTarget) {
        return {
          eligibility: "ALREADY_COMPLETE",
          note: "Already a member of target calendar.",
          recoveryEligible: false,
        };
      }
      return {
        eligibility: "ELIGIBLE",
        note: null,
        recoveryEligible: true,
      };
    }
    case "REMOVE_CALENDAR": {
      if (!input.targetCalendarId) {
        return {
          eligibility: "INELIGIBLE",
          note: "Target calendar required.",
          recoveryEligible: false,
        };
      }
      if (input.isPrimaryCalendarTarget) {
        return {
          eligibility: "INELIGIBLE",
          note: "Cannot remove primary calendar membership.",
          recoveryEligible: false,
        };
      }
      if (!input.alreadyMemberOfTarget) {
        return {
          eligibility: "ALREADY_COMPLETE",
          note: "Not a member of target calendar.",
          recoveryEligible: false,
        };
      }
      return {
        eligibility: "ELIGIBLE",
        note: null,
        recoveryEligible: true,
      };
    }
    default:
      return {
        eligibility: "INELIGIBLE",
        note: "Unknown action.",
        recoveryEligible: false,
      };
  }
}
