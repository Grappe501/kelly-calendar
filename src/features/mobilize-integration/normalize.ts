import { createHash } from "node:crypto";
import type {
  NormalizedMobilizeAttendance,
  NormalizedMobilizeDeletedEvent,
  NormalizedMobilizeEvent,
  NormalizedMobilizeOrganization,
  NormalizedMobilizePerson,
  NormalizedMobilizeTimeslot,
} from "@/features/mobilize-integration/types";

function unixToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function unknownKeys(raw: Record<string, unknown>, known: string[]): string[] {
  return Object.keys(raw).filter((k) => !known.includes(k)).sort();
}

export function fingerprintPayload(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function normalizeOrganization(
  raw: Record<string, unknown>,
): NormalizedMobilizeOrganization | null {
  const id = asId(raw.id);
  if (!id) return null;
  return {
    id,
    name: asString(raw.name) ?? "",
    slug: asString(raw.slug) ?? "",
    orgType: asString(raw.org_type),
    state: asString(raw.state),
    createdAt: unixToIso(raw.created_date),
    modifiedAt: unixToIso(raw.modified_date),
    rawUnknownKeys: unknownKeys(raw, [
      "id",
      "name",
      "slug",
      "is_coordinated",
      "is_independent",
      "race_type",
      "is_primary_campaign",
      "state",
      "district",
      "candidate_name",
      "event_feed_url",
      "created_date",
      "modified_date",
      "org_type",
    ]),
  };
}

function normalizeTimeslot(
  raw: Record<string, unknown>,
): NormalizedMobilizeTimeslot | null {
  const id = asId(raw.id);
  if (!id) return null;
  return {
    id,
    startAt: unixToIso(raw.start_date ?? raw.start_at),
    endAt: unixToIso(raw.end_date ?? raw.end_at),
    rawUnknownKeys: unknownKeys(raw, [
      "id",
      "start_date",
      "end_date",
      "start_at",
      "end_at",
      "is_full",
      "instructions",
    ]),
  };
}

export function normalizeEvent(
  raw: Record<string, unknown>,
): NormalizedMobilizeEvent | null {
  const id = asId(raw.id);
  if (!id) return null;
  const timeslotsRaw = Array.isArray(raw.timeslots) ? raw.timeslots : [];
  const timeslots = timeslotsRaw
    .map((t) =>
      t && typeof t === "object"
        ? normalizeTimeslot(t as Record<string, unknown>)
        : null,
    )
    .filter(Boolean) as NormalizedMobilizeTimeslot[];

  const loc =
    raw.location && typeof raw.location === "object"
      ? (raw.location as Record<string, unknown>)
      : null;
  const visibility = asString(raw.visibility);
  const addressVisibility = asString(loc?.address_visibility ?? loc?.visibility);
  const isPrivate =
    visibility === "PRIVATE" ||
    addressVisibility === "PRIVATE" ||
    addressVisibility === "HIDDEN";

  const addressLinesRaw = Array.isArray(loc?.address_lines)
    ? loc.address_lines
    : [];
  const location = loc
    ? {
        venue: asString(loc.venue),
        addressLines: [
          asString(addressLinesRaw[0] ?? loc.address1),
          asString(addressLinesRaw[1] ?? loc.address2),
        ].filter(Boolean) as string[],
        locality: asString(loc.locality ?? loc.city),
        region: asString(loc.region ?? loc.state),
        postalCode: asString(loc.postal_code ?? loc.zipcode),
        country: asString(loc.country),
        latitude:
          typeof (loc.location as { latitude?: number } | undefined)?.latitude ===
          "number"
            ? (loc.location as { latitude: number }).latitude
            : typeof loc.latitude === "number"
              ? loc.latitude
              : null,
        longitude:
          typeof (loc.location as { longitude?: number } | undefined)
            ?.longitude === "number"
            ? (loc.location as { longitude: number }).longitude
            : typeof loc.longitude === "number"
              ? loc.longitude
              : null,
        isPrivate,
      }
    : null;

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .map((t) =>
          t && typeof t === "object"
            ? asString((t as Record<string, unknown>).name)
            : asString(t),
        )
        .filter(Boolean) as string[]
    : [];

  const title = asString(raw.title) ?? asString(raw.name) ?? `Mobilize event ${id}`;
  const modifiedAt = unixToIso(raw.modified_date);
  const createdAt = unixToIso(raw.created_date);
  const fingerprint = fingerprintPayload([
    id,
    title,
    modifiedAt ?? "",
    timeslots.map((t) => `${t.id}:${t.startAt}:${t.endAt}`).join(","),
    visibility ?? "",
    asString(raw.event_type) ?? "",
  ]);

  return {
    id,
    title,
    description: asString(raw.description),
    timezone: asString(raw.timezone),
    eventType: asString(raw.event_type),
    visibility,
    timeslots,
    location,
    tags,
    createdAt,
    modifiedAt,
    fingerprint,
    rawUnknownKeys: unknownKeys(raw, [
      "id",
      "title",
      "name",
      "description",
      "timezone",
      "event_type",
      "visibility",
      "timeslots",
      "location",
      "tags",
      "created_date",
      "modified_date",
      "sponsor",
      "featured_image_url",
      "high_priority",
      "contact",
      "instructions",
      "private_description",
    ]),
  };
}

export function normalizeDeletedEvent(
  raw: Record<string, unknown>,
): NormalizedMobilizeDeletedEvent | null {
  const id = asId(raw.id);
  if (!id) return null;
  return {
    id,
    deletedAt: unixToIso(raw.deleted_date ?? raw.modified_date),
  };
}

export function normalizePerson(
  raw: Record<string, unknown>,
): NormalizedMobilizePerson | null {
  const id = asId(raw.id);
  if (!id) return null;
  const emails = Array.isArray(raw.email_addresses) ? raw.email_addresses : [];
  const phones = Array.isArray(raw.phone_numbers) ? raw.phone_numbers : [];
  return {
    id,
    hasEmail: emails.length > 0,
    hasPhone: phones.length > 0,
    fingerprint: fingerprintPayload([id, String(emails.length), String(phones.length)]),
  };
}

export function normalizeAttendance(
  raw: Record<string, unknown>,
): NormalizedMobilizeAttendance | null {
  const id = asId(raw.id);
  if (!id) return null;
  const eventObj =
    raw.event && typeof raw.event === "object"
      ? (raw.event as Record<string, unknown>)
      : null;
  const personObj =
    raw.person && typeof raw.person === "object"
      ? (raw.person as Record<string, unknown>)
      : null;
  const timeslotObj =
    raw.timeslot && typeof raw.timeslot === "object"
      ? (raw.timeslot as Record<string, unknown>)
      : null;
  const eventId = asId(eventObj?.id ?? raw.event_id);
  if (!eventId) return null;
  const status = asString(raw.status);
  const isCancelled = status === "CANCELLED";
  // Documented statuses REGISTERED/CONFIRMED are signup/RSVP — not Mission check-in.
  const isSignup =
    status === "REGISTERED" || status === "CONFIRMED" || (!isCancelled && status != null);
  const attended =
    typeof raw.attended === "boolean"
      ? raw.attended
      : raw.attended === null
        ? null
        : null;
  const customFields = Array.isArray(raw.custom_signup_field_values)
    ? raw.custom_signup_field_values
    : [];
  const timeslotId = asId(timeslotObj?.id ?? raw.timeslot_id);
  const personId = asId(personObj?.id ?? raw.person_id);
  return {
    id,
    eventId,
    timeslotId,
    personId,
    status,
    isSignup: isSignup && !isCancelled,
    isCancelled,
    attended,
    createdAt: unixToIso(raw.created_date),
    modifiedAt: unixToIso(raw.modified_date),
    customSignupFieldCount: customFields.length,
    hasReferrer: Boolean(raw.referrer && typeof raw.referrer === "object"),
    fingerprint: fingerprintPayload([
      id,
      eventId,
      timeslotId ?? "",
      status ?? "",
      personId ?? "",
      String(attended),
      String(raw.modified_date ?? ""),
    ]),
  };
}
