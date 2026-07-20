import type { LocalEventForPublish } from "@/features/mobilize-integration/publishing/mapping";
import {
  mapLocalEventToMobilizeDocument,
  type PublishMappingOptions,
} from "@/features/mobilize-integration/publishing/mapping";

export type EligibilityIssue = {
  code: string;
  severity: "blocking" | "warning" | "privacy" | "unsupported" | "info";
  message: string;
};

export type EligibilityInput = {
  event: LocalEventForPublish | null;
  campaignAuthorized: boolean;
  connectionState: string;
  organizationId: string | null;
  expectedOrganizationId: string | null;
  publishingEnabled: boolean;
  updatesEnabled: boolean;
  hasActiveMobilizeReference: boolean;
  unresolvedConflict: boolean;
  mappingOptions?: PublishMappingOptions;
};

export type EligibilityResult = {
  eligible: boolean;
  action: "CREATE" | "UPDATE" | "NONE";
  issues: EligibilityIssue[];
  mappingPreview: ReturnType<typeof mapLocalEventToMobilizeDocument> | null;
};

export function assessMobilizePublishEligibility(
  input: EligibilityInput,
): EligibilityResult {
  const issues: EligibilityIssue[] = [];
  const event = input.event;

  if (!input.campaignAuthorized) {
    issues.push({
      code: "CAMPAIGN_UNAUTHORIZED",
      severity: "blocking",
      message: "Actor is not authorized for this campaign.",
    });
  }

  if (!event) {
    issues.push({
      code: "EVENT_MISSING",
      severity: "blocking",
      message: "Local Event does not exist.",
    });
    return { eligible: false, action: "NONE", issues, mappingPreview: null };
  }

  if (event.archivedAt) {
    issues.push({
      code: "EVENT_ARCHIVED",
      severity: "blocking",
      message: "Archived Events cannot be published.",
    });
  }

  if (event.status === "CANCELLED") {
    issues.push({
      code: "EVENT_CANCELLED",
      severity: "warning",
      message:
        "Local Event is cancelled — publishing is blocked; remote delete is not performed automatically.",
    });
    issues.push({
      code: "EVENT_CANCELLED_BLOCK",
      severity: "blocking",
      message: "Cancelled Events are not eligible for create/update publish.",
    });
  }

  if (!event.campaignDisplayTitle?.trim() && !event.publicTitle?.trim()) {
    issues.push({
      code: "TITLE_REQUIRED",
      severity: "blocking",
      message: "Event needs a public or campaign display title.",
    });
  }

  const starts = new Date(event.startsAt).getTime();
  const ends = new Date(event.endsAt).getTime();
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || !(starts < ends)) {
    issues.push({
      code: "INVALID_TIMESLOT",
      severity: "blocking",
      message: "Event start/end times must be valid with start before end.",
    });
  }

  if (input.unresolvedConflict) {
    issues.push({
      code: "UNRESOLVED_CONFLICT",
      severity: "blocking",
      message: "Resolve publication conflicts before publishing.",
    });
  }

  if (
    input.expectedOrganizationId &&
    input.organizationId &&
    input.expectedOrganizationId !== input.organizationId
  ) {
    issues.push({
      code: "ORG_MISMATCH",
      severity: "blocking",
      message: "Configured organization does not match connection organization.",
    });
  }

  const mapping = mapLocalEventToMobilizeDocument(
    event,
    input.mappingOptions ?? {},
  );
  for (const field of mapping.fields) {
    if (field.status === "REQUIRES_DECISION") {
      issues.push({
        code: `MAP_${field.field.toUpperCase()}_DECISION`,
        severity: "blocking",
        message: field.note ?? `${field.field} requires an explicit decision.`,
      });
    }
    if (field.status === "UNSUPPORTED" && field.field === "event_type") {
      issues.push({
        code: "UNSUPPORTED_EVENT_TYPE",
        severity: "unsupported",
        message: field.note ?? "Unsupported event type.",
      });
    }
  }
  for (const warning of mapping.privacyWarnings) {
    issues.push({
      code: "PRIVACY",
      severity: "privacy",
      message: warning,
    });
  }
  issues.push({
    code: "OMITTED_SENSITIVE",
    severity: "info",
    message: `Intentionally omitted: ${mapping.omittedSensitive.join(", ")}`,
  });

  const action: EligibilityResult["action"] = input.hasActiveMobilizeReference
    ? "UPDATE"
    : "CREATE";

  if (action === "CREATE" && !input.publishingEnabled) {
    issues.push({
      code: "PUBLISHING_DISABLED",
      severity: "warning",
      message:
        "Network publishing is disabled — preview/approval still available in NOT_CONFIGURED or flag-off mode.",
    });
  }
  if (action === "UPDATE" && !input.updatesEnabled) {
    issues.push({
      code: "UPDATES_DISABLED",
      severity: "warning",
      message:
        "Network updates are disabled — preview/approval still available locally.",
    });
  }

  if (
    input.connectionState === "NOT_CONFIGURED" ||
    !input.organizationId
  ) {
    issues.push({
      code: "NOT_CONFIGURED",
      severity: "info",
      message:
        "Mobilize credentials are not configured — previews work; remote writes stay unavailable.",
    });
  }

  const blocking = issues.some((i) => i.severity === "blocking");
  return {
    eligible: !blocking && mapping.document !== null,
    action,
    issues,
    mappingPreview: mapping,
  };
}
