import "server-only";

import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

const SECRET_KEY_PATTERN =
  /(password|token|secret|cookie|authorization|refresh|database_url|direct_url|sourceurl|confirmation)/i;

export function redactAuditPayload(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactAuditPayload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (typeof v === "string" && /(postgres(ql)?:\/\/|eyJ[A-Za-z0-9_-]+\.)/i.test(v)) {
      out[k] = "[REDACTED]";
      continue;
    }
    out[k] = redactAuditPayload(v);
  }
  return out;
}

export async function recordAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  source?: string | null;
  reason?: string | null;
  previousState?: unknown;
  newState?: unknown;
  metadata?: unknown;
}) {
  requireAuthorizedMutation(`audit:${input.action}`);
  // Wired after Step 4 via audit-repository; gate prevents live writes now.
  void redactAuditPayload(input.previousState);
  void redactAuditPayload(input.newState);
}
