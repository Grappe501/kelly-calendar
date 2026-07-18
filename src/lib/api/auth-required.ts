import { NextResponse } from "next/server";

export function jsonAuthRequired(requestId: string, message: string, path: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message,
        path,
      },
      requestId,
    },
    { status: 401, headers: { "x-request-id": requestId } },
  );
}
