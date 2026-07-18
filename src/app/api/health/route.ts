import { NextResponse } from "next/server";
import {
  CURRENT_STEP_ID,
  PRODUCT_CODE,
  SERVICE_NAME,
} from "@/lib/system/constants";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    {
      ok: true,
      service: SERVICE_NAME,
      productCode: PRODUCT_CODE,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
      currentStep: CURRENT_STEP_ID,
      requestId,
    },
    { headers: { "x-request-id": requestId } },
  );
}
