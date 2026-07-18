import "server-only";

import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

const gated =
  (action: string) =>
  async (input: unknown = undefined) => {
    void input;
    requireAuthorizedMutation(action);
  };

export const replaceProgramFlow = gated("replaceProgramFlow");
export const replacePackingChecklist = gated("replacePackingChecklist");
export const replaceStaffAssignments = gated("replaceStaffAssignments");
export const replaceEventActions = gated("replaceEventActions");
export const replaceCommunicationsPlan = gated("replaceCommunicationsPlan");
export const replaceTravelPlan = gated("replaceTravelPlan");
export const replaceObjectives = gated("replaceObjectives");
