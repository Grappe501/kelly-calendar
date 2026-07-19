export type GoogleImportSourceType = "PUBLIC_ICAL" | "PRIVATE_ICAL_ENV" | "GOOGLE_API";

export type GoogleCalendarImportManifest = {
  importId: string;
  sourceType: GoogleImportSourceType;
  sourceLabel: string;
  sourceFingerprint: string;
  requestedRange: {
    startsAt: string;
    endsAt: string;
    timezone: "America/Chicago";
  };
  fetchedAt: string;
  completedAt?: string;
  counts: {
    fetched: number;
    parsed: number;
    normalized: number;
    staged: number;
    duplicates: number;
    rejected: number;
    recurringMasters: number;
    recurringInstances: number;
    allDayEvents: number;
    cancelledEvents: number;
  };
  databaseWriteAttempted: false;
  migrationAttempted: false;
  operatorReviewRequired: true;
  status:
    | "STARTED"
    | "FETCHED"
    | "NORMALIZED"
    | "STAGED"
    | "PARTIAL"
    | "FAILED";
  errorSummary?: string;
};

export type PrimaryCalendarProposal =
  | "CANDIDATE"
  | "TRAVEL"
  | "FUNDRAISING"
  | "PUBLIC_EVENTS"
  | "INTERNAL_MEETINGS"
  | "COMMUNICATIONS"
  | "SOCIAL_MEDIA"
  | "PRESS_MEDIA"
  | "FIELD"
  | "COUNTY_ACTIVITY"
  | "VOLUNTEER"
  | "COMPLIANCE"
  | "STAFF_WORK"
  | "DEBATE_PREP"
  | "SURROGATE"
  | "PROTECTED_PERSONAL"
  | "UNCLASSIFIED";

export type DeduplicationStatus =
  | "NEW"
  | "EXACT_DUPLICATE"
  | "LIKELY_DUPLICATE"
  | "POSSIBLE_DUPLICATE"
  | "NEEDS_REVIEW";

export type ReviewStatus =
  | "UNREVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_EDIT"
  | "MERGE";

export type StagedCalendarEvent = {
  stagedEventId: string;
  source: {
    provider: "GOOGLE_CALENDAR";
    sourceType: GoogleImportSourceType;
    sourceCalendarLabel: string;
    externalEventId?: string;
    iCalUid?: string;
    recurringEventId?: string;
    sourceFingerprint: string;
    sourceLastModifiedAt?: string;
    sourceSequence?: number;
  };
  timing: {
    startsAt: string;
    endsAt: string;
    timezone: string;
    allDay: boolean;
    recurring: boolean;
    recurrenceRule?: string;
    originalStartTime?: string;
  };
  basic: {
    importedTitle: string;
    importedDescription?: string;
    importedLocation?: string;
    importedStatus?: string;
    importedUrl?: string;
  };
  proposedClassification: {
    primaryCalendar: PrimaryCalendarProposal;
    eventType?: string;
    confidence: number;
    reasons: string[];
  };
  geographicProposal: {
    venue?: string;
    city?: string;
    county?: string;
    state?: string;
    region?: string;
    rawLocation?: string;
    needsReview: boolean;
  };
  deduplication: {
    fingerprint: string;
    status: DeduplicationStatus;
    matchedStagedEventIds: string[];
    reasons: string[];
  };
  review: {
    status: ReviewStatus;
    reviewedAt?: string;
    reviewerNote?: string;
  };
  enrichment?: {
    kellyPresent?: boolean | null;
    wasCampaignEvent?: boolean | null;
    travelOnly?: boolean | null;
    organization?: string;
    audienceType?: string;
    historicalSignificance?: string;
    followUpRequired?: boolean | null;
  };
};

export type ParsedIcalEvent = {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  url?: string;
  status?: string;
  dtstart?: string;
  dtend?: string;
  dtstartValueType?: "DATE" | "DATE-TIME";
  rrule?: string;
  recurrenceId?: string;
  sequence?: number;
  lastModified?: string;
  rawBlock: string;
};

export type ImportRangeOptions = {
  startsAt: string;
  endsAt: string;
  includeCancelled: boolean;
  includeAllDay: boolean;
  expandRecurring: boolean;
  importDescriptions: boolean;
  importLocations: boolean;
  importLinks: boolean;
};
