import { redactForLog } from "@/lib/env/redact-environment";

export function sanitizeLogData(data: unknown): unknown {
  return redactForLog(data);
}
