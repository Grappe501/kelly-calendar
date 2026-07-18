import "server-only";

import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function requestApproval(input: unknown) {
  void input;
  requireAuthorizedMutation("requestApproval");
}

export async function resolveApproval(input: unknown) {
  void input;
  requireAuthorizedMutation("resolveApproval");
}
