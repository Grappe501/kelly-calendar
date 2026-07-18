import { NextResponse } from "next/server";
import { logger } from "@/lib/logging/logger";
import {
  statusFromError,
  toSafeErrorBody,
  type AppError,
} from "@/lib/security/safe-error";

export function jsonSafeError(error: unknown, requestId: string, route: string) {
  const body = toSafeErrorBody(error, requestId);
  const status = statusFromError(error);
  logger.error("api_error", {
    requestId,
    route,
    status,
    data: {
      code: body.error.code,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? (error as AppError).message : "unknown",
    },
  });
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  });
}
