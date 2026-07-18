import { NextResponse } from "next/server";
import { getCapabilityStatus } from "@/lib/system/capabilities";

export const dynamic = "force-dynamic";

export function GET() {
  const status = getCapabilityStatus({ databaseTested: false });
  return NextResponse.json(status);
}
