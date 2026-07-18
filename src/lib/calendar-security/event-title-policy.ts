export type EventTitleFields = {
  internalTitle: string;
  campaignDisplayTitle?: string;
  restrictedDisplayTitle?: string;
  publicTitle?: string;
  /** When sensitive, never fall back to internalTitle for limited audiences */
  sensitivity?: string;
};

export type TitleAudience =
  | "full"
  | "campaign_limited"
  | "busy_category"
  | "public"
  | "busy_only";

const SENSITIVE = new Set([
  "FUNDRAISING_SENSITIVE",
  "SECURITY_SENSITIVE",
  "PROTECTED_PERSONAL",
  "INTERNAL",
]);

/**
 * Resolve which title string a viewer may see.
 * Never returns internal titles for limited / busy_only audiences when sensitivity requires it.
 */
export function resolveDisplayTitle(
  titles: EventTitleFields,
  audience: TitleAudience,
  calendarName: string,
): string {
  const categoryFallback = `${calendarName.replace(/ Calendar$/i, "")} Event`;
  const sensitive = titles.sensitivity
    ? SENSITIVE.has(titles.sensitivity)
    : false;

  switch (audience) {
    case "full":
      return titles.internalTitle;
    case "campaign_limited": {
      const safe =
        titles.campaignDisplayTitle?.trim() ||
        titles.restrictedDisplayTitle?.trim();
      if (safe) return safe;
      if (sensitive) return categoryFallback;
      return titles.internalTitle;
    }
    case "busy_category":
      return titles.restrictedDisplayTitle?.trim() || categoryFallback;
    case "public":
      return titles.publicTitle?.trim() || "Campaign Event";
    case "busy_only":
      return titles.restrictedDisplayTitle?.trim() || "Unavailable";
    default:
      return "Unavailable";
  }
}
