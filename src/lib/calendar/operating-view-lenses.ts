/**
 * Operating-view lens ids — projections over the canonical Event graph.
 * Build: KCCC-EA-10-CALENDAR-OPERATING-VIEWS-1.0
 */
export const OPERATING_VIEW_LENSES = [
  "today",
  "day",
  "week",
  "month",
  "agenda",
  "travel",
  "preparation",
  "follow_up",
  "conflicts",
  "people",
  "counties",
  "mission",
] as const;

export type OperatingViewLens = (typeof OPERATING_VIEW_LENSES)[number];

export const OPERATING_VIEW_QUESTIONS: Record<OperatingViewLens, string> = {
  today: "What do I need to do today?",
  day: "How does my entire day flow?",
  week: "What is this week trying to accomplish?",
  month: "Where are the campaign peaks?",
  agenda: "What must eventually happen?",
  travel: "Where do I need to go, and when must I leave?",
  preparation: "What still needs work before events?",
  follow_up: "What remains after events?",
  conflicts: "What schedule or travel conflicts need attention?",
  people: "Which people and organizations appear across events?",
  counties: "Where is the campaign showing up geographically?",
  mission: "What is the operational timeline derived from events?",
};

/** Lenses shipped as primary UX in Step 10. */
export const PRIMARY_OPERATING_VIEWS = [
  "today",
  "day",
  "week",
  "month",
  "agenda",
] as const;

/** Designed projections — may start as filtered Event lists. */
export const SECONDARY_OPERATING_VIEWS = [
  "travel",
  "preparation",
  "follow_up",
  "conflicts",
  "people",
  "counties",
  "mission",
] as const;
