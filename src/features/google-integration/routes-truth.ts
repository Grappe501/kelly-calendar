export const ROUTE_TRUTH_TYPE_ESTIMATE = "GOOGLE_ROUTE_ESTIMATE" as const;

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function isVirtualOnlyEvent(input: {
  location?: string | null;
  city?: string | null;
  venueName?: string | null;
  virtualMeetingUrl?: string | null;
  isAllDay?: boolean;
}): boolean {
  const hasPhysical = Boolean(
    input.location?.trim() || input.city?.trim() || input.venueName?.trim(),
  );
  if (hasPhysical) return false;
  return Boolean(input.virtualMeetingUrl?.trim());
}
