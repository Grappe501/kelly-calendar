import { normalizeRequestId } from "@/lib/security/request-id";

export function getRequestIdFromHeaders(headers: Headers): string {
  return normalizeRequestId(headers.get("x-request-id"));
}
