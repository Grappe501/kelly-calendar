export const LOCATION_DISCLOSURE_LEVELS = [
  "EXACT",
  "VENUE",
  "CITY",
  "COUNTY",
  "REGION",
  "HIDDEN",
] as const;

export type LocationDisclosureLevel = (typeof LOCATION_DISCLOSURE_LEVELS)[number];

export type EventLocationParts = {
  venue?: string;
  city?: string;
  county?: string;
  region?: string;
  state?: string;
  exactAddress?: string;
};

export function isLocationDisclosureLevel(
  value: string,
): value is LocationDisclosureLevel {
  return (LOCATION_DISCLOSURE_LEVELS as readonly string[]).includes(value);
}

/**
 * Build a safe location label. Never returns exactAddress for limited levels.
 */
export function resolveLocationLabel(
  location: EventLocationParts | undefined,
  disclosure: LocationDisclosureLevel,
): string | undefined {
  if (!location || disclosure === "HIDDEN") return undefined;

  const state = location.state ?? "Arkansas";

  switch (disclosure) {
    case "EXACT": {
      if (location.exactAddress) return location.exactAddress;
      const composed = [location.venue, location.city, state]
        .filter(Boolean)
        .join(", ");
      return composed || undefined;
    }
    case "VENUE":
      if (location.venue && location.city) {
        return `${location.venue}, ${location.city}, ${state}`;
      }
      return location.venue ?? withCity(location, state);
    case "CITY":
      return withCity(location, state);
    case "COUNTY":
      return location.county
        ? location.county.includes("County")
          ? location.county
          : `${location.county} County`
        : withCity(location, state);
    case "REGION":
      return location.region ?? withCity(location, state);
    default:
      return undefined;
  }
}

function withCity(location: EventLocationParts, state: string): string | undefined {
  if (!location.city) return location.region;
  return `${location.city}, ${state}`;
}
