/**
 * IC-02C hierarchy-derived access — server-side contracts.
 * Titles alone never grant access; ACTIVE/INTERIM assignments do.
 */

export type OrgBoardKey =
  | "campaign_manager"
  | "volunteer_organizing"
  | "communications"
  | "finance"
  | "operations_data"
  | "cluster"
  | "county"
  | "volunteer"
  | "organization_directory";

const PROFILE_BOARDS: Record<string, OrgBoardKey[]> = {
  CANDIDATE: ["campaign_manager", "organization_directory"],
  CAMPAIGN_MANAGER: [
    "campaign_manager",
    "volunteer_organizing",
    "communications",
    "finance",
    "operations_data",
    "organization_directory",
  ],
  DEPARTMENT_MANAGER: ["organization_directory"],
  COORDINATOR: ["organization_directory"],
  FINANCE_MANAGER: ["finance", "organization_directory"],
  FINANCE_COORDINATOR: ["finance"],
  CLUSTER_MANAGER: ["cluster", "organization_directory"],
  COUNTY_CAPTAIN: ["county", "organization_directory"],
  VOLUNTEER: ["volunteer"],
};

const DEPT_MANAGER_BOARD: Record<string, OrgBoardKey> = {
  VOLUNTEER_AND_ORGANIZING: "volunteer_organizing",
  COMMUNICATIONS: "communications",
  FINANCE: "finance",
  OPERATIONS_AND_DATA: "operations_data",
};

export function boardsForPermissionsProfile(
  profile: string,
  departmentKey?: string | null,
): OrgBoardKey[] {
  const base = [...(PROFILE_BOARDS[profile] ?? ["volunteer"])];
  if (profile === "DEPARTMENT_MANAGER" && departmentKey) {
    const board = DEPT_MANAGER_BOARD[departmentKey];
    if (board) base.push(board);
  }
  return [...new Set(base)];
}

/** Proposed / invited / declined never grant operational authority. */
export function assignmentGrantsAccess(status: string): boolean {
  return status === "ACTIVE" || status === "INTERIM";
}

export function volunteerMaySeeSensitiveBoard(board: OrgBoardKey): boolean {
  return board === "volunteer";
}

export function financeBoardRequiresRestrictedProfile(profile: string): boolean {
  return (
    profile === "FINANCE_MANAGER" ||
    profile === "FINANCE_COORDINATOR" ||
    profile === "CAMPAIGN_MANAGER" ||
    profile === "CANDIDATE"
  );
}

export const COUNTY_MATURITY_STAGES = [
  "UNCONTACTED",
  "INITIAL_RELATIONSHIPS",
  "EMERGING_TEAM",
  "LEADERSHIP_ESTABLISHED",
  "ACTIVE_RECURRING_ORGANIZATION",
  "DURABLE_LOCAL_NETWORK",
] as const;

/** Event attendance alone never advances maturity. */
export function maturityFromEventAttendanceAlone(): "UNCONTACTED" {
  return "UNCONTACTED";
}
