import type { IcsPrivacyProfile } from "@/lib/calendar/ics/types";

const PROFILE_RANK: Record<IcsPrivacyProfile, number> = {
  BUSY_ONLY: 0,
  CITY_ONLY: 1,
  OPERATIONAL_REDACTED: 2,
};

export type IcsPolicyEventInput = {
  campaignDisplayTitle?: string | null;
  publicTitle?: string | null;
  internalTitle?: string | null;
  city?: string | null;
  state?: string | null;
  streetAddress?: string | null;
  venueName?: string | null;
  publicDescription?: string | null;
  campaignDescription?: string | null;
  privateNotes?: string | null;
  travelNotes?: string | null;
  missionNotes?: string | null;
  status?: string | null;
  isResidential?: boolean | null;
};

export type IcsPolicyFields = {
  summary: string;
  description?: string;
  location?: string;
};

export function moreRestrictiveIcsProfile(
  a: IcsPrivacyProfile,
  b: IcsPrivacyProfile,
): IcsPrivacyProfile {
  return PROFILE_RANK[a] <= PROFILE_RANK[b] ? a : b;
}

export function residentialVenueHeuristic(
  venueName?: string | null,
  streetAddress?: string | null,
): boolean {
  if (streetAddress && streetAddress.trim()) return true;
  const name = (venueName ?? "").trim().toLowerCase();
  if (!name) return false;
  return (
    /\b(home|house|residence|residential|apartment|apt\.?|condo|private\s+home)\b/i.test(
      name,
    ) || /\b\d{1,6}\s+\w+/.test(name)
  );
}

function authorizedTitle(event: IcsPolicyEventInput): string {
  const campaign = event.campaignDisplayTitle?.trim();
  if (campaign) return campaign;
  const pub = event.publicTitle?.trim();
  if (pub) return pub;
  return "Event";
}

function cityStateLocation(event: IcsPolicyEventInput): string | undefined {
  const city = event.city?.trim();
  const state = event.state?.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return undefined;
}

function operationalLocation(event: IcsPolicyEventInput): string | undefined {
  const base = cityStateLocation(event);
  const venue = event.venueName?.trim();
  const street = event.streetAddress?.trim();
  const residential =
    event.isResidential === true || residentialVenueHeuristic(venue, street);

  if (!venue || street || residential) {
    return base;
  }
  if (base) return `${venue}, ${base}`;
  return venue;
}

/**
 * Apply ICS privacy profile (intersected with maxVisibilityGrant) to produce
 * SUMMARY / DESCRIPTION / LOCATION fields. Never emits streetAddress or privateNotes.
 */
export function applyIcsPrivacyPolicy(input: {
  profile: IcsPrivacyProfile;
  event: IcsPolicyEventInput;
  maxVisibilityGrant: IcsPrivacyProfile;
}): IcsPolicyFields {
  const profile = moreRestrictiveIcsProfile(
    input.profile,
    input.maxVisibilityGrant,
  );

  if (profile === "BUSY_ONLY") {
    return { summary: "Busy" };
  }

  if (profile === "CITY_ONLY") {
    const fields: IcsPolicyFields = {
      summary: authorizedTitle(input.event),
      location: cityStateLocation(input.event),
    };
    const pub = input.event.publicDescription?.trim();
    if (pub) fields.description = pub;
    return fields;
  }

  const fields: IcsPolicyFields = {
    summary: authorizedTitle(input.event),
    location: operationalLocation(input.event),
  };
  const pub = input.event.publicDescription?.trim();
  const campaign = input.event.campaignDescription?.trim();
  if (pub) fields.description = pub;
  else if (campaign) fields.description = campaign;
  return fields;
}

const ADDRESS_LEAK_PATTERNS = [
  /\bstreetAddress\b/i,
  /\b\d{1,6}\s+[\w.]+\s+(st|street|ave|avenue|rd|road|ln|lane|dr|drive|blvd|boulevard|ct|court|way|hwy|highway)\b/i,
];

/** Test helper: projection must not contain exact-address material. */
export function assertNoExactAddress(projection: {
  summary?: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}): void {
  const blob = JSON.stringify(projection);
  if (/privateNotes/i.test(blob)) {
    throw new Error("ICS projection must not include privateNotes");
  }
  if (/"streetAddress"\s*:/i.test(blob)) {
    throw new Error("ICS projection must not include streetAddress");
  }
  for (const pattern of ADDRESS_LEAK_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error("ICS projection appears to include an exact address");
    }
  }
  const location = typeof projection.location === "string" ? projection.location : "";
  if (/\d{1,6}\s+\w+/.test(location) && /\b(st|street|ave|rd|ln|dr)\b/i.test(location)) {
    throw new Error("ICS location must not include street address text");
  }
}
