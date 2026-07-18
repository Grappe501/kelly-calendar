export function calculateStaffCoverage(input: {
  requiredRoles: Array<{ roleType: string; required: boolean }>;
  assignedRoles: Array<{ roleType: string; confirmed?: boolean }>;
}) {
  const required = input.requiredRoles.filter((r) => r.required);
  const assignedTypes = new Set(input.assignedRoles.map((r) => r.roleType));
  const confirmedTypes = new Set(
    input.assignedRoles.filter((r) => r.confirmed).map((r) => r.roleType),
  );
  const unassigned = required.filter((r) => !assignedTypes.has(r.roleType)).map((r) => r.roleType);
  const coverageScore =
    required.length === 0
      ? 100
      : Math.round(((required.length - unassigned.length) / required.length) * 100);

  return {
    requiredRoles: required.map((r) => r.roleType),
    assignedRoles: [...assignedTypes],
    confirmedRoles: [...confirmedTypes],
    unassignedRoles: unassigned,
    coverageScore,
    criticalGaps: unassigned,
  };
}
