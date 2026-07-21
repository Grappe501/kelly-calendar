import { NextResponse } from "next/server";
import { processCommunicationsWebhook } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export async function POST(request: Request, context: Ctx) {
  const { provider } = await context.params;
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const result = await processCommunicationsWebhook({
    providerKey: provider,
    rawBody,
    headers,
  });

  return NextResponse.json(result.body, { status: result.status });
}
