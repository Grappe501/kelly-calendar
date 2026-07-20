import type { NormalizedMobilizeAttendance } from "@/features/mobilize-integration/types";
import { fingerprintPayload } from "@/features/mobilize-integration/normalize";

export type AttendanceStatusCategory =
  | "SIGNUP_REGISTERED"
  | "SIGNUP_CONFIRMED"
  | "CANCELLED"
  | "ATTENDED"
  | "NOT_ATTENDED"
  | "ATTENDED_UNSET"
  | "UNKNOWN_STATUS";

/**
 * Map Mobilize status + attended into separate categories.
 * Never collapses signup + attended into one "attendee" number.
 * Never infers no-show solely because a timeslot ended.
 */
export function categorizeAttendance(
  row: NormalizedMobilizeAttendance,
): AttendanceStatusCategory {
  if (row.isCancelled || row.status === "CANCELLED") return "CANCELLED";
  if (row.status === "REGISTERED") {
    if (row.attended === true) return "ATTENDED";
    if (row.attended === false) return "NOT_ATTENDED";
    return "SIGNUP_REGISTERED";
  }
  if (row.status === "CONFIRMED") {
    if (row.attended === true) return "ATTENDED";
    if (row.attended === false) return "NOT_ATTENDED";
    return "SIGNUP_CONFIRMED";
  }
  if (row.attended === true) return "ATTENDED";
  if (row.attended === false) return "NOT_ATTENDED";
  if (row.status == null) return "ATTENDED_UNSET";
  return "UNKNOWN_STATUS";
}

export type AttendanceAggregateBucket = {
  externalEventId: string;
  externalTimeslotId: string | null;
  localEventId: string | null;
  localMissionId: string | null;
  signupsRegistered: number;
  signupsConfirmed: number;
  cancellations: number;
  attended: number;
  notAttended: number;
  attendedUnset: number;
  unknownStatus: number;
  totalObservations: number;
};

export type AttendanceAggregateReport = {
  byEventTimeslot: AttendanceAggregateBucket[];
  totals: Omit<
    AttendanceAggregateBucket,
    "externalEventId" | "externalTimeslotId" | "localEventId" | "localMissionId"
  >;
  unmatchedTimeslotIds: string[];
  unknownStatuses: string[];
  customSignupFieldsDeniedCount: number;
  referrerFieldsOmittedCount: number;
  containsPii: false;
};

export function buildAttendanceAggregates(input: {
  rows: NormalizedMobilizeAttendance[];
  localEventByExternalEventId?: Map<string, string>;
  localMissionByLocalEventId?: Map<string, string>;
  knownRemoteTimeslotIds?: Set<string>;
}): AttendanceAggregateReport {
  const map = new Map<string, AttendanceAggregateBucket>();
  const unknownStatuses = new Set<string>();
  let customDenied = 0;
  let referrerOmitted = 0;
  const seenTimeslots = new Set<string>();

  for (const row of input.rows) {
    customDenied += row.customSignupFieldCount;
    if (row.hasReferrer) referrerOmitted += 1;
    if (
      row.status &&
      row.status !== "REGISTERED" &&
      row.status !== "CONFIRMED" &&
      row.status !== "CANCELLED"
    ) {
      unknownStatuses.add(row.status);
    }
    if (row.timeslotId) seenTimeslots.add(row.timeslotId);

    const localEventId =
      input.localEventByExternalEventId?.get(row.eventId) ?? null;
    const localMissionId = localEventId
      ? input.localMissionByLocalEventId?.get(localEventId) ?? null
      : null;
    const key = `${row.eventId}|${row.timeslotId ?? "none"}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        externalEventId: row.eventId,
        externalTimeslotId: row.timeslotId,
        localEventId,
        localMissionId,
        signupsRegistered: 0,
        signupsConfirmed: 0,
        cancellations: 0,
        attended: 0,
        notAttended: 0,
        attendedUnset: 0,
        unknownStatus: 0,
        totalObservations: 0,
      };
      map.set(key, bucket);
    }
    bucket.totalObservations += 1;
    const cat = categorizeAttendance(row);
    switch (cat) {
      case "SIGNUP_REGISTERED":
        bucket.signupsRegistered += 1;
        break;
      case "SIGNUP_CONFIRMED":
        bucket.signupsConfirmed += 1;
        break;
      case "CANCELLED":
        bucket.cancellations += 1;
        break;
      case "ATTENDED":
        bucket.attended += 1;
        break;
      case "NOT_ATTENDED":
        bucket.notAttended += 1;
        break;
      case "ATTENDED_UNSET":
        bucket.attendedUnset += 1;
        break;
      default:
        bucket.unknownStatus += 1;
    }
  }

  const unmatchedTimeslotIds: string[] = [];
  if (input.knownRemoteTimeslotIds) {
    for (const id of input.knownRemoteTimeslotIds) {
      if (!seenTimeslots.has(id)) unmatchedTimeslotIds.push(id);
    }
  }

  const buckets = [...map.values()];
  const totals = {
    signupsRegistered: 0,
    signupsConfirmed: 0,
    cancellations: 0,
    attended: 0,
    notAttended: 0,
    attendedUnset: 0,
    unknownStatus: 0,
    totalObservations: 0,
  };
  for (const b of buckets) {
    totals.signupsRegistered += b.signupsRegistered;
    totals.signupsConfirmed += b.signupsConfirmed;
    totals.cancellations += b.cancellations;
    totals.attended += b.attended;
    totals.notAttended += b.notAttended;
    totals.attendedUnset += b.attendedUnset;
    totals.unknownStatus += b.unknownStatus;
    totals.totalObservations += b.totalObservations;
  }

  return {
    byEventTimeslot: buckets,
    totals,
    unmatchedTimeslotIds,
    unknownStatuses: [...unknownStatuses].sort(),
    customSignupFieldsDeniedCount: customDenied,
    referrerFieldsOmittedCount: referrerOmitted,
    containsPii: false,
  };
}

export type PersonMatchEvidence = {
  existingExternalRefLocalPersonId?: string | null;
  exactEmailLocalPersonIds?: string[];
  exactPhoneLocalPersonIds?: string[];
  nameOnlyLocalPersonIds?: string[];
  operatorSelectedLocalPersonId?: string | null;
};

export type PersonMatchProposal = {
  externalPersonId: string;
  proposedLocalPersonId: string | null;
  matchMethod:
    | "EXISTING_EXTERNAL_REF"
    | "EXACT_EMAIL"
    | "EXACT_PHONE"
    | "OPERATOR_SELECTED"
    | "MULTI_FIELD"
    | "NAME_ONLY";
  confidenceCategory: "HIGH" | "MEDIUM" | "LOW" | "AMBIGUOUS";
  status: "UNMATCHED" | "PROPOSED" | "AMBIGUOUS" | "CONFIRMED" | "REJECTED" | "DO_NOT_LINK";
  conflictReason: string | null;
  provenanceSummary: string;
};

/**
 * Conservative matching — never auto-creates or merges local people.
 * Name-only stays AMBIGUOUS. Shared email/phone stays AMBIGUOUS.
 */
export function proposePersonMatch(input: {
  externalPersonId: string;
  evidence: PersonMatchEvidence;
  doNotLink?: boolean;
}): PersonMatchProposal {
  if (input.doNotLink) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: null,
      matchMethod: "OPERATOR_SELECTED",
      confidenceCategory: "HIGH",
      status: "DO_NOT_LINK",
      conflictReason: null,
      provenanceSummary: "Operator marked DO_NOT_LINK.",
    };
  }
  if (input.evidence.operatorSelectedLocalPersonId) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: input.evidence.operatorSelectedLocalPersonId,
      matchMethod: "OPERATOR_SELECTED",
      confidenceCategory: "HIGH",
      status: "PROPOSED",
      conflictReason: null,
      provenanceSummary: "Operator-selected local person.",
    };
  }
  if (input.evidence.existingExternalRefLocalPersonId) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: input.evidence.existingExternalRefLocalPersonId,
      matchMethod: "EXISTING_EXTERNAL_REF",
      confidenceCategory: "HIGH",
      status: "PROPOSED",
      conflictReason: null,
      provenanceSummary: "Existing ExternalObjectReference for person.",
    };
  }
  const emails = input.evidence.exactEmailLocalPersonIds ?? [];
  const phones = input.evidence.exactPhoneLocalPersonIds ?? [];
  if (emails.length === 1 && phones.length <= 1) {
    if (phones.length === 1 && phones[0] !== emails[0]) {
      return {
        externalPersonId: input.externalPersonId,
        proposedLocalPersonId: null,
        matchMethod: "MULTI_FIELD",
        confidenceCategory: "AMBIGUOUS",
        status: "AMBIGUOUS",
        conflictReason: "Email and phone resolve to different local people.",
        provenanceSummary: "Conflicting exact identifiers.",
      };
    }
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: emails[0]!,
      matchMethod: phones.length === 1 ? "MULTI_FIELD" : "EXACT_EMAIL",
      confidenceCategory: phones.length === 1 ? "HIGH" : "MEDIUM",
      status: "PROPOSED",
      conflictReason: null,
      provenanceSummary: "Exact authorized email match (phone consistent or absent).",
    };
  }
  if (emails.length > 1 || phones.length > 1) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: null,
      matchMethod: emails.length > 1 ? "EXACT_EMAIL" : "EXACT_PHONE",
      confidenceCategory: "AMBIGUOUS",
      status: "AMBIGUOUS",
      conflictReason: "Shared household or duplicate local identifiers.",
      provenanceSummary: "Multiple local people share the exact identifier.",
    };
  }
  if (phones.length === 1) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: phones[0]!,
      matchMethod: "EXACT_PHONE",
      confidenceCategory: "MEDIUM",
      status: "PROPOSED",
      conflictReason: null,
      provenanceSummary: "Exact authorized phone match.",
    };
  }
  const names = input.evidence.nameOnlyLocalPersonIds ?? [];
  if (names.length >= 1) {
    return {
      externalPersonId: input.externalPersonId,
      proposedLocalPersonId: null,
      matchMethod: "NAME_ONLY",
      confidenceCategory: "AMBIGUOUS",
      status: "AMBIGUOUS",
      conflictReason: "Name-only matches must not auto-link.",
      provenanceSummary: `Name-only candidates: ${names.length}.`,
    };
  }
  return {
    externalPersonId: input.externalPersonId,
    proposedLocalPersonId: null,
    matchMethod: "NAME_ONLY",
    confidenceCategory: "LOW",
    status: "UNMATCHED",
    conflictReason: null,
    provenanceSummary: "No authorized exact identity evidence.",
  };
}

export function observationFingerprint(parts: {
  externalAttendanceId: string;
  remoteStatus: string;
  attended: boolean | null;
  timeslotId: string | null;
  modifiedAt: string | null;
}): string {
  return fingerprintPayload([
    parts.externalAttendanceId,
    parts.remoteStatus,
    String(parts.attended),
    parts.timeslotId ?? "",
    parts.modifiedAt ?? "",
  ]);
}

export function assertMobilizeAttendanceIsolation() {
  return {
    mutatesEventLifecycle: false,
    mutatesMission: false,
    mutatesPrepare: false,
    mutatesExecute: false,
    mutatesDebrief: false,
    mutatesFollowUp: false,
    mutatesTravel: false,
    mutatesLogistics: false,
    mutatesFieldOps: false,
    mutatesIncidents: false,
    mutatesExceptionDigest: false,
    mutatesCloseout: false,
    mutatesLaunchReview: false,
    mutatesDayLaunch: false,
    writesMobilizePeople: false,
    writesMobilizeAttendance: false,
    treatsSignupAsAttendance: false,
    treatsAttendanceAsCheckIn: false,
    treatsAttendanceAsExecute: false,
    infersCommunicationConsent: false,
    autoCreatesLocalPerson: false,
    autoMergesLocalPeople: false,
    personLevelApplyEnabled: false,
  } as const;
}
