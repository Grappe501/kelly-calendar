import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import { fingerprintPayload } from "@/features/mobilize-integration/normalize";

export const MOBILIZE_MAPPING_VERSION = MOBILIZE_DOCS.mappingVersion;

export type FieldMappingStatus =
  | "LOCAL_VALUE"
  | "PROPOSED_REMOTE"
  | "OMITTED"
  | "UNSUPPORTED"
  | "REQUIRES_DECISION";

export type MappedField = {
  field: string;
  status: FieldMappingStatus;
  localValue: unknown;
  proposedRemoteValue: unknown;
  note?: string;
};

export type MobilizeTimeslotWrite = {
  /** Remote Mobilize timeslot id when known (update path). */
  id?: number;
  localKey: string;
  start_date: number;
  end_date: number;
  max_attendees?: number | null;
  instructions?: string | null;
};

export type MobilizeEventWriteDocument = {
  title: string;
  description: string;
  timeslots: MobilizeTimeslotWrite[];
  timezone: string;
  event_type: string;
  visibility: "PUBLIC" | "PRIVATE";
  contact: { email_address: string; name?: string; phone_number?: string };
  location?: {
    venue?: string;
    address_lines?: string[];
    locality?: string;
    region?: string;
    postal_code: string;
    country?: string;
  };
  is_virtual?: boolean;
  virtual_action_url?: string;
  address_visibility?: "PUBLIC" | "PRIVATE";
  accessibility_status?: string;
  accessibility_notes?: string;
  instructions?: string;
};

export type LocalEventForPublish = {
  id: string;
  eventNumber: string;
  internalTitle: string;
  campaignDisplayTitle: string;
  publicTitle: string | null;
  eventType: string | null;
  status: string;
  archivedAt: Date | string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  timezone: string;
  defaultVisibility: string;
  locationDisclosure: string;
  venueName: string | null;
  streetAddress: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  locationNotes: string | null;
  virtualMeetingUrl: string | null;
  publicDescription: string | null;
  campaignDescription: string | null;
  privateNotes: string | null;
  expectedAttendance: number | null;
  sensitivityLevel: string | null;
};

export type PublishMappingOptions = {
  /** Explicit Mobilize event type — never auto-invented. */
  eventType?: string | null;
  /** Explicit Mobilize visibility — never auto for PUBLIC without policy. */
  visibility?: "PUBLIC" | "PRIVATE" | null;
  addressVisibility?: "PUBLIC" | "PRIVATE" | null;
  contactEmail?: string | null;
  contactName?: string | null;
  /** Private attendee instructions only when explicitly provided for publish. */
  attendeeInstructions?: string | null;
  accessibilityStatus?: string | null;
  accessibilityNotes?: string | null;
  /** Remote timeslot id map keyed by localKey (usually event id + index). */
  remoteTimeslotIds?: Record<string, number>;
  /** Extra timeslots beyond the primary Event window. */
  additionalTimeslots?: Array<{
    localKey: string;
    startsAt: Date | string;
    endsAt: Date | string;
    maxAttendees?: number | null;
    instructions?: string | null;
  }>;
  isVirtual?: boolean | null;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toUnix(value: Date | string): number {
  return Math.floor(toDate(value).getTime() / 1000);
}

function stripHtmlToSafeText(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+=["'][^"']*["']/gi, "")
    .trim();
}

const WRITABLE_TYPES = new Set<string>(MOBILIZE_DOCS.writableEventTypes);
const WRITABLE_TZ = new Set<string>(MOBILIZE_DOCS.writableTimezones);

export function isWritableMobilizeEventType(value: string | null | undefined): boolean {
  if (!value) return false;
  return WRITABLE_TYPES.has(value.trim().toUpperCase());
}

export function normalizeWritableTimezone(tz: string): string | null {
  const trimmed = tz.trim();
  if (WRITABLE_TZ.has(trimmed)) return trimmed;
  // Common aliases → documented allowlist
  const aliases: Record<string, string> = {
    "US/Central": "America/Chicago",
    "US/Eastern": "America/New_York",
    "US/Pacific": "America/Los_Angeles",
    "US/Mountain": "America/Denver",
    "US/Arizona": "America/Phoenix",
    "US/Hawaii": "Pacific/Honolulu",
  };
  return aliases[trimmed] ?? null;
}

export function mapVisibility(
  local: string,
  explicit?: "PUBLIC" | "PRIVATE" | null,
): { value: "PUBLIC" | "PRIVATE" | null; status: FieldMappingStatus; note?: string } {
  if (explicit === "PUBLIC" || explicit === "PRIVATE") {
    return { value: explicit, status: "PROPOSED_REMOTE" };
  }
  if (local === "PUBLIC") {
    return { value: "PUBLIC", status: "PROPOSED_REMOTE" };
  }
  if (
    local === "TEAM_ONLY" ||
    local === "LEADERSHIP_ONLY" ||
    local === "NAMED_USERS" ||
    local === "BUSY_ONLY" ||
    local === "PROTECTED"
  ) {
    return {
      value: "PRIVATE",
      status: "PROPOSED_REMOTE",
      note: "Campaign-restricted visibility maps to Mobilize PRIVATE.",
    };
  }
  return {
    value: null,
    status: "REQUIRES_DECISION",
    note: "Select PUBLIC or PRIVATE for Mobilize — ambiguous local visibility.",
  };
}

export function mapAddressVisibility(
  disclosure: string,
  explicit?: "PUBLIC" | "PRIVATE" | null,
): { value: "PUBLIC" | "PRIVATE"; status: FieldMappingStatus; note?: string } {
  if (explicit === "PUBLIC" || explicit === "PRIVATE") {
    return { value: explicit, status: "PROPOSED_REMOTE" };
  }
  if (disclosure === "EXACT" || disclosure === "VENUE") {
    return { value: "PUBLIC", status: "PROPOSED_REMOTE" };
  }
  return {
    value: "PRIVATE",
    status: "PROPOSED_REMOTE",
    note: "Non-exact location disclosure maps to Mobilize address_visibility PRIVATE.",
  };
}

export function mapEventType(
  localType: string | null,
  explicit?: string | null,
): { value: string | null; status: FieldMappingStatus; note?: string } {
  const candidate = (explicit ?? localType)?.trim().toUpperCase() ?? null;
  if (!candidate) {
    return {
      value: null,
      status: "REQUIRES_DECISION",
      note: "Mobilize event_type must be selected explicitly.",
    };
  }
  if (candidate === "ADVOCACY_CALL") {
    return {
      value: null,
      status: "UNSUPPORTED",
      note: "ADVOCACY_CALL create/update is not supported by Mobilize API.",
    };
  }
  if (!isWritableMobilizeEventType(candidate)) {
    return {
      value: null,
      status: "REQUIRES_DECISION",
      note: `Unknown or unsupported event type "${candidate}" — preserve safely; do not invent.`,
    };
  }
  return { value: candidate, status: "PROPOSED_REMOTE" };
}

/**
 * Build a versioned Mobilize publication document from a local Event.
 * Never includes Mission / Travel / Logistics / Field Ops / Incident / Digest data.
 */
export function mapLocalEventToMobilizeDocument(
  event: LocalEventForPublish,
  options: PublishMappingOptions = {},
): {
  mappingVersion: string;
  document: MobilizeEventWriteDocument | null;
  fields: MappedField[];
  omittedSensitive: string[];
  privacyWarnings: string[];
  payloadFingerprint: string | null;
  localFingerprint: string;
} {
  const fields: MappedField[] = [];
  const privacyWarnings: string[] = [];
  const omittedSensitive = [
    "privateNotes",
    "internalTitle",
    "campaignDescription",
    "locationNotes",
    "Mission.*",
    "Travel.*",
    "Logistics.*",
    "FieldOps.*",
    "Incident.*",
    "ExceptionDigest.*",
  ];

  const title =
    event.publicTitle?.trim() ||
    event.campaignDisplayTitle?.trim() ||
    event.internalTitle?.trim() ||
    "";
  fields.push({
    field: "title",
    status: title ? "PROPOSED_REMOTE" : "REQUIRES_DECISION",
    localValue: {
      publicTitle: event.publicTitle,
      campaignDisplayTitle: event.campaignDisplayTitle,
    },
    proposedRemoteValue: title || null,
    note: "Uses publicTitle, else campaignDisplayTitle. internalTitle never published.",
  });

  const descriptionSource =
    event.publicDescription?.trim() ||
    (event.campaignDisplayTitle
      ? `<p>${stripHtmlToSafeText(event.campaignDisplayTitle)}</p>`
      : "");
  const description = descriptionSource
    ? stripHtmlToSafeText(descriptionSource)
    : "";
  fields.push({
    field: "description",
    status: description ? "PROPOSED_REMOTE" : "REQUIRES_DECISION",
    localValue: event.publicDescription,
    proposedRemoteValue: description || null,
    note: "privateNotes and campaignDescription are omitted.",
  });
  if (event.privateNotes) {
    privacyWarnings.push("privateNotes present locally and intentionally omitted.");
  }
  if (event.campaignDescription) {
    privacyWarnings.push(
      "campaignDescription intentionally omitted from Mobilize payload.",
    );
  }

  const typeMap = mapEventType(event.eventType, options.eventType);
  fields.push({
    field: "event_type",
    status: typeMap.status,
    localValue: event.eventType,
    proposedRemoteValue: typeMap.value,
    note: typeMap.note,
  });

  const vis = mapVisibility(event.defaultVisibility, options.visibility);
  fields.push({
    field: "visibility",
    status: vis.status,
    localValue: event.defaultVisibility,
    proposedRemoteValue: vis.value,
    note: vis.note,
  });

  const addrVis = mapAddressVisibility(
    event.locationDisclosure,
    options.addressVisibility,
  );
  fields.push({
    field: "address_visibility",
    status: addrVis.status,
    localValue: event.locationDisclosure,
    proposedRemoteValue: addrVis.value,
    note: addrVis.note,
  });

  const tz = normalizeWritableTimezone(event.timezone);
  fields.push({
    field: "timezone",
    status: tz ? "PROPOSED_REMOTE" : "REQUIRES_DECISION",
    localValue: event.timezone,
    proposedRemoteValue: tz,
    note: tz
      ? undefined
      : "Timezone must be one of Mobilize's documented write allowlist.",
  });

  const isVirtual =
    options.isVirtual === true ||
    Boolean(event.virtualMeetingUrl?.trim()) && options.isVirtual !== false;
  const primaryKey = `${event.id}:primary`;
  const primarySlot: MobilizeTimeslotWrite = {
    localKey: primaryKey,
    start_date: toUnix(event.startsAt),
    end_date: toUnix(event.endsAt),
    max_attendees: event.expectedAttendance ?? undefined,
  };
  if (options.remoteTimeslotIds?.[primaryKey]) {
    primarySlot.id = options.remoteTimeslotIds[primaryKey];
  }
  const extra = (options.additionalTimeslots ?? []).map((slot) => {
    const write: MobilizeTimeslotWrite = {
      localKey: slot.localKey,
      start_date: toUnix(slot.startsAt),
      end_date: toUnix(slot.endsAt),
      max_attendees: slot.maxAttendees ?? undefined,
      instructions: slot.instructions ?? undefined,
    };
    if (options.remoteTimeslotIds?.[slot.localKey]) {
      write.id = options.remoteTimeslotIds[slot.localKey];
    }
    return write;
  });
  const timeslots = [primarySlot, ...extra];
  fields.push({
    field: "timeslots",
    status: timeslots.length > 0 ? "PROPOSED_REMOTE" : "REQUIRES_DECISION",
    localValue: { startsAt: event.startsAt, endsAt: event.endsAt },
    proposedRemoteValue: timeslots.map((t) => ({
      id: t.id ?? null,
      localKey: t.localKey,
      start_date: t.start_date,
      end_date: t.end_date,
      max_attendees: t.max_attendees ?? null,
    })),
    note: "Multiple timeslots are children of one Mobilize event — never multiple Missions.",
  });

  const contactEmail = options.contactEmail?.trim() || null;
  fields.push({
    field: "contact",
    status: contactEmail ? "PROPOSED_REMOTE" : "REQUIRES_DECISION",
    localValue: null,
    proposedRemoteValue: contactEmail
      ? { email_address: contactEmail, name: options.contactName ?? undefined }
      : null,
    note: "Contact email must be explicitly configured — never invented from private staff data.",
  });

  let location:
    | MobilizeEventWriteDocument["location"]
    | undefined;
  if (!isVirtual) {
    if (event.postalCode?.trim()) {
      location = {
        venue: event.venueName ?? undefined,
        address_lines: [
          event.streetAddress ?? "",
          event.addressLine2 ?? "",
        ],
        locality: event.city ?? undefined,
        region: event.state === "Arkansas" ? "AR" : event.state ?? undefined,
        postal_code: event.postalCode.trim(),
        country: "US",
      };
      if (addrVis.value === "PRIVATE") {
        privacyWarnings.push(
          "Address will publish with address_visibility PRIVATE per Mobilize rules.",
        );
      }
      fields.push({
        field: "location",
        status: "PROPOSED_REMOTE",
        localValue: {
          venueName: event.venueName,
          city: event.city,
          postalCode: event.postalCode,
        },
        proposedRemoteValue: location,
      });
    } else {
      fields.push({
        field: "location",
        status: "REQUIRES_DECISION",
        localValue: { postalCode: event.postalCode },
        proposedRemoteValue: null,
        note: "postal_code required for in-person Mobilize events.",
      });
    }
  } else {
    fields.push({
      field: "location",
      status: "OMITTED",
      localValue: null,
      proposedRemoteValue: null,
      note: "Virtual event — location omitted.",
    });
  }

  fields.push({
    field: "is_virtual",
    status: "PROPOSED_REMOTE",
    localValue: Boolean(event.virtualMeetingUrl),
    proposedRemoteValue: isVirtual,
  });

  if (isVirtual && event.virtualMeetingUrl) {
    fields.push({
      field: "virtual_action_url",
      status: "PROPOSED_REMOTE",
      localValue: event.virtualMeetingUrl,
      proposedRemoteValue: event.virtualMeetingUrl,
    });
  } else {
    fields.push({
      field: "virtual_action_url",
      status: "OMITTED",
      localValue: event.virtualMeetingUrl,
      proposedRemoteValue: null,
    });
  }

  if (options.attendeeInstructions?.trim()) {
    privacyWarnings.push(
      "Private attendee instructions will be sent to Mobilize instructions field.",
    );
    fields.push({
      field: "instructions",
      status: "PROPOSED_REMOTE",
      localValue: options.attendeeInstructions,
      proposedRemoteValue: options.attendeeInstructions.trim(),
    });
  } else {
    fields.push({
      field: "instructions",
      status: "OMITTED",
      localValue: null,
      proposedRemoteValue: null,
      note: "Mission/private operational notes are never used as attendee instructions.",
    });
  }

  if (options.accessibilityStatus) {
    fields.push({
      field: "accessibility_status",
      status: "PROPOSED_REMOTE",
      localValue: options.accessibilityStatus,
      proposedRemoteValue: options.accessibilityStatus,
    });
  } else {
    fields.push({
      field: "accessibility_status",
      status: "OMITTED",
      localValue: null,
      proposedRemoteValue: null,
    });
  }

  fields.push({
    field: "tag_ids",
    status: "UNSUPPORTED",
    localValue: null,
    proposedRemoteValue: null,
    note: "Tag writes omitted until tag catalog sync is verified.",
  });
  fields.push({
    field: "featured_image_url",
    status: "UNSUPPORTED",
    localValue: null,
    proposedRemoteValue: null,
    note: "Image upload remains disabled in D17.",
  });

  const localFingerprint = fingerprintPayload([
    event.id,
    event.eventNumber,
    String(toUnix(event.startsAt)),
    String(toUnix(event.endsAt)),
    event.timezone,
    event.campaignDisplayTitle,
    event.publicTitle ?? "",
    event.publicDescription ?? "",
    event.eventType ?? "",
    event.defaultVisibility,
    event.locationDisclosure,
    event.postalCode ?? "",
    event.virtualMeetingUrl ?? "",
    String(event.expectedAttendance ?? ""),
    event.status,
    event.archivedAt ? "archived" : "active",
  ]);

  const blocking =
    !title ||
    !description ||
    !typeMap.value ||
    !vis.value ||
    !tz ||
    !contactEmail ||
    timeslots.length === 0 ||
    timeslots.some((t) => !(t.start_date < t.end_date)) ||
    (!isVirtual && !location);

  if (blocking) {
    return {
      mappingVersion: MOBILIZE_MAPPING_VERSION,
      document: null,
      fields,
      omittedSensitive,
      privacyWarnings,
      payloadFingerprint: null,
      localFingerprint,
    };
  }

  const document: MobilizeEventWriteDocument = {
    title,
    description,
    timeslots,
    timezone: tz!,
    event_type: typeMap.value!,
    visibility: vis.value!,
    contact: {
      email_address: contactEmail!,
      ...(options.contactName ? { name: options.contactName } : {}),
    },
    is_virtual: isVirtual,
    address_visibility: addrVis.value,
  };
  if (location) document.location = location;
  if (isVirtual && event.virtualMeetingUrl) {
    document.virtual_action_url = event.virtualMeetingUrl;
  }
  if (options.attendeeInstructions?.trim()) {
    document.instructions = options.attendeeInstructions.trim();
  }
  if (options.accessibilityStatus) {
    document.accessibility_status = options.accessibilityStatus;
  }
  if (options.accessibilityNotes) {
    document.accessibility_notes = options.accessibilityNotes;
  }

  const wirePayload = toMobilizeWirePayload(document);
  const payloadFingerprint = fingerprintPayload([
    MOBILIZE_MAPPING_VERSION,
    JSON.stringify(wirePayload),
  ]);

  return {
    mappingVersion: MOBILIZE_MAPPING_VERSION,
    document,
    fields,
    omittedSensitive,
    privacyWarnings,
    payloadFingerprint,
    localFingerprint,
  };
}

/** Wire JSON for Mobilize create/update — strips localKey from timeslots. */
export function toMobilizeWirePayload(
  document: MobilizeEventWriteDocument,
): Record<string, unknown> {
  return {
    title: document.title,
    description: document.description,
    timezone: document.timezone,
    event_type: document.event_type,
    visibility: document.visibility,
    contact: document.contact,
    timeslots: document.timeslots.map((t) => {
      const slot: Record<string, unknown> = {
        start_date: t.start_date,
        end_date: t.end_date,
      };
      if (typeof t.id === "number") slot.id = t.id;
      if (t.max_attendees != null) slot.max_attendees = t.max_attendees;
      if (t.instructions) slot.instructions = t.instructions;
      return slot;
    }),
    ...(document.location ? { location: document.location } : {}),
    ...(document.is_virtual != null ? { is_virtual: document.is_virtual } : {}),
    ...(document.virtual_action_url
      ? { virtual_action_url: document.virtual_action_url }
      : {}),
    ...(document.address_visibility
      ? { address_visibility: document.address_visibility }
      : {}),
    ...(document.accessibility_status
      ? { accessibility_status: document.accessibility_status }
      : {}),
    ...(document.accessibility_notes
      ? { accessibility_notes: document.accessibility_notes }
      : {}),
    ...(document.instructions ? { instructions: document.instructions } : {}),
  };
}

export function assertPayloadHasNoSensitiveKeys(
  payload: Record<string, unknown>,
): string[] {
  const banned = [
    "privateNotes",
    "internalTitle",
    "missionId",
    "travel",
    "logistics",
    "fieldOps",
    "incident",
    "exceptionDigest",
    "driver",
    "passenger",
  ];
  const found: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = path ? `${path}.${k}` : k;
      if (banned.some((b) => k.toLowerCase().includes(b.toLowerCase()))) {
        found.push(next);
      }
      walk(v, next);
    }
  };
  walk(payload, "");
  return found;
}
