import type { SystemRoleName } from "@/lib/auth/system-roles";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import type {
  MissionIncidentPersisted,
  MissionIncidentUpdatePersisted,
} from "@/lib/missions/v21/incident-log/types";

export function canViewSensitiveIncident(role: SystemRoleName): boolean {
  return roleHasFullCalendarAccess(role);
}

type RedactableIncident = Pick<
  MissionIncidentPersisted,
  "summary" | "description" | "immediateActionSummary" | "sensitivity"
> & {
  updates?: MissionIncidentUpdatePersisted[];
};

/** Strip narrative fields for unauthorized viewers on restricted incidents. */
export function redactIncidentForViewer<T extends RedactableIncident>(
  incident: T,
  role: SystemRoleName,
): T {
  if (canViewSensitiveIncident(role)) return incident;
  if (
    incident.sensitivity !== "RESTRICTED" &&
    incident.sensitivity !== "CONFIDENTIAL"
  ) {
    return incident;
  }
  return {
    ...incident,
    summary: `[${incident.sensitivity} — access required]`,
    description: null,
    immediateActionSummary: null,
    updates: incident.updates?.map((update) => ({
      ...update,
      note: null,
      actionTaken: null,
    })),
  };
}

/** Day board and report cards hide confidential narrative by default. */
export function redactForBoard<T extends Pick<
  MissionIncidentPersisted,
  "summary" | "description" | "sensitivity"
>>(incident: T): T {
  if (incident.sensitivity !== "CONFIDENTIAL") return incident;
  return {
    ...incident,
    summary: "",
    description: null,
  };
}
