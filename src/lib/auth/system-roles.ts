export const SYSTEM_ROLES = [
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
  "STAFF",
  "VOLUNTEER",
  "READ_ONLY_ADVISOR",
  "SYSTEM_AI",
] as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[number];

export function isSystemRole(value: string): value is SystemRoleName {
  return (SYSTEM_ROLES as readonly string[]).includes(value);
}

/** Roles that may mutate calendar/event data when membership allows. */
export function roleMayMutate(role: SystemRoleName): boolean {
  return (
    role === "KELLY" ||
    role === "CAMPAIGN_MANAGER" ||
    role === "SCHEDULER" ||
    role === "STAFF"
  );
}

/** Kelly has full command authority across calendars. */
export function roleHasFullCalendarAccess(role: SystemRoleName): boolean {
  return role === "KELLY" || role === "CAMPAIGN_MANAGER";
}

export function roleIsReadOnly(role: SystemRoleName): boolean {
  return role === "READ_ONLY_ADVISOR" || role === "SYSTEM_AI" || role === "VOLUNTEER";
}
