import "server-only";

import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";
import { listActiveEventTemplates } from "@/server/repositories/template-repository";

export async function listTemplates() {
  return listActiveEventTemplates();
}

export async function applyEventTemplate(input: unknown) {
  void input;
  requireAuthorizedMutation("applyEventTemplate");
}
