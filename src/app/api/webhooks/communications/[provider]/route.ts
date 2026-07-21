import { NextResponse } from "next/server";
import { resolveProviderAdapter } from "@/lib/missions/v21/communications/dispatch/registry";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

/**
 * Provider webhook ingress — no campaign session auth.
 * Fail closed for unknown/disabled providers before any DB work.
 * Signature verification happens inside the registered adapter only.
 */
export async function POST(request: Request, context: Ctx) {
  try {
    const { provider } = await context.params;
    const providerKey = (provider ?? "").trim().toLowerCase();
    if (!providerKey) {
      return NextResponse.json(
        { ok: false, error: "Provider webhook not registered." },
        { status: 404 },
      );
    }

    const adapter = resolveProviderAdapter(providerKey, {
      allowTestAdapter: process.env.NODE_ENV !== "production",
    });

    // Allow official adapters: resend (always) and kccc-sandbox (non-production only).
    const allowedOfficial =
      providerKey === "resend" ||
      (providerKey === "kccc-sandbox" && process.env.NODE_ENV !== "production");

    // Unknown vendor keys and the disabled adapter fail closed with 404.
    if (
      !allowedOfficial &&
      (adapter.providerKey === "disabled" ||
        adapter.providerKey !== providerKey)
    ) {
      return NextResponse.json(
        { ok: false, error: "Provider webhook not registered." },
        { status: 404 },
      );
    }

    if (allowedOfficial && adapter.providerKey === "disabled") {
      return NextResponse.json(
        { ok: false, error: "Provider webhook not registered." },
        { status: 404 },
      );
    }

    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const { processCommunicationsWebhook } = await import(
      "@/server/services/communications-dispatch-service"
    );
    const result = await processCommunicationsWebhook({
      providerKey,
      rawBody,
      headers,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
