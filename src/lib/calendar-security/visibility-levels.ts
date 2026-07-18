export const VISIBILITY_LEVELS = [
  "FULL",
  "LIMITED",
  "TITLE_LOCATION",
  "BUSY_WITH_CATEGORY",
  "BUSY_ONLY",
  "HIDDEN_FROM_UNAUTHENTICATED",
  "PUBLIC",
] as const;

export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export function isVisibilityLevel(value: string): value is VisibilityLevel {
  return (VISIBILITY_LEVELS as readonly string[]).includes(value);
}
