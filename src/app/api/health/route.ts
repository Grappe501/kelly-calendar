import { NextResponse } from "next/server";
import {
  CURRENT_STEP_ID,
  PRODUCT_CODE,
  SERVICE_NAME,
} from "@/lib/system/capabilities";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: SERVICE_NAME,
    productCode: PRODUCT_CODE,
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    currentStep: CURRENT_STEP_ID,
  });
}
