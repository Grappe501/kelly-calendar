export type MobilizeErrorCategory =
  | "NOT_CONFIGURED"
  | "INVALID_CREDENTIALS"
  | "ORGANIZATION_MISMATCH"
  | "INSUFFICIENT_ACCESS"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK"
  | "PARSE"
  | "VALIDATION"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type MobilizeConnectionState =
  | "NOT_CONFIGURED"
  | "CONFIGURED_UNVERIFIED"
  | "CONNECTED"
  | "INVALID_CREDENTIALS"
  | "ORGANIZATION_MISMATCH"
  | "INSUFFICIENT_ACCESS"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "DEGRADED";

export type CapabilityTier = {
  documented: boolean;
  credentialTested: boolean;
  applicationEnabled: boolean;
};

export type MobilizeCapabilityReport = {
  connectionState: MobilizeConnectionState;
  organization: {
    id: string | null;
    name: string | null;
    slug: string | null;
  };
  lastVerifiedAt: string | null;
  rateLimitObserved: boolean;
  capabilities: {
    readOrganizations: CapabilityTier;
    readOrganizationEvents: CapabilityTier;
    readPrivateEventFields: CapabilityTier;
    readDeletedEvents: CapabilityTier;
    readPeople: CapabilityTier;
    readAttendances: CapabilityTier;
    readEventAttendances: CapabilityTier;
    readEnums: CapabilityTier;
    createEvents: CapabilityTier;
    updateEvents: CapabilityTier;
    deleteEvents: CapabilityTier;
    createAttendances: CapabilityTier;
    uploadImages: CapabilityTier;
    createAffiliations: CapabilityTier;
  };
  /** True when neither create nor update application flags are on. */
  outboundWritesForcedDisabled: boolean;
  personLevelApplyEnabled: false;
  attendanceApplyEnabled: false;
  affiliationWritesEnabled: false;
  imageUploadsEnabled: false;
  documentationRevision: string;
  adapterVersion: string;
  mappingVersion: string;
};

export type NormalizedUnknownEnum = string;

export type NormalizedMobilizeOrganization = {
  id: string;
  name: string;
  slug: string;
  orgType: NormalizedUnknownEnum | null;
  state: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  rawUnknownKeys: string[];
};

export type NormalizedMobilizeTimeslot = {
  id: string;
  startAt: string | null;
  endAt: string | null;
  rawUnknownKeys: string[];
};

export type NormalizedMobilizeLocation = {
  venue: string | null;
  addressLines: string[];
  locality: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Private address details must not be copied to public local fields. */
  isPrivate: boolean;
};

export type NormalizedMobilizeEvent = {
  id: string;
  title: string;
  description: string | null;
  timezone: string | null;
  eventType: NormalizedUnknownEnum | null;
  visibility: NormalizedUnknownEnum | null;
  timeslots: NormalizedMobilizeTimeslot[];
  location: NormalizedMobilizeLocation | null;
  tags: string[];
  createdAt: string | null;
  modifiedAt: string | null;
  fingerprint: string;
  rawUnknownKeys: string[];
};

export type NormalizedMobilizeDeletedEvent = {
  id: string;
  deletedAt: string | null;
};

export type NormalizedMobilizePerson = {
  id: string;
  /** Aggregate-safe identity only — emails/phones not exposed to UI. */
  hasEmail: boolean;
  hasPhone: boolean;
  fingerprint: string;
};

export type NormalizedMobilizeAttendance = {
  id: string;
  eventId: string;
  personId: string | null;
  status: NormalizedUnknownEnum | null;
  /** Signup ≠ attendance confirmation. */
  isSignup: boolean;
  fingerprint: string;
};

export type MobilizeListPage<T> = {
  data: T[];
  count: number | null;
  next: string | null;
  previous: string | null;
  resultsLimitedTo: number | null;
};

export type SyncCandidateAction =
  | "NEW_REMOTE"
  | "MATCHED_UNCHANGED"
  | "REMOTE_CHANGED"
  | "LOCAL_CHANGED"
  | "BOTH_CHANGED"
  | "REMOTE_DELETED"
  | "AMBIGUOUS_MATCH"
  | "CONFLICT"
  | "UNSUPPORTED"
  | "IGNORED";

export type EventReconcileCandidate = {
  action: SyncCandidateAction;
  externalObjectId: string;
  externalObjectType: "EVENT";
  proposedLocalObjectType: "Event" | null;
  proposedLocalObjectId: string | null;
  comparisonFingerprint: string;
  changeSummary: string;
  conflictState: "NONE" | "DETECTED" | "MANUAL_REQUIRED";
  event: NormalizedMobilizeEvent | null;
};
