import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  NormalizedDeliveryEvent,
  RawWebhookInput,
  VerifiedWebhookResult,
} from "@/lib/missions/v21/communications/dispatch/types";
import { DEFAULT_WEBHOOK_TOLERANCE_SECONDS } from "@/lib/missions/v21/communications/dispatch/types";

export function webhookReplayFingerprint(
  providerKey: string,
  providerEventId: string | null,
  rawBody: string,
): string {
  return createHash("sha256")
    .update(`${providerKey}|${providerEventId ?? ""}|${rawBody}`)
    .digest("hex");
}

/** HMAC-SHA256 hex signature over `${timestamp}.${rawBody}`. */
export function signTestWebhook(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export function verifyHmacSha256Signature(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signatureHex: string;
  receivedAtIso: string;
  toleranceSeconds?: number;
}): { ok: boolean; category: string | null } {
  const tolerance = input.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, category: "INVALID_TIMESTAMP" };
  }
  const received = Date.parse(input.receivedAtIso);
  if (!Number.isFinite(received)) {
    return { ok: false, category: "INVALID_RECEIVED_AT" };
  }
  if (Math.abs(received / 1000 - ts) > tolerance) {
    return { ok: false, category: "TIMESTAMP_OUT_OF_TOLERANCE" };
  }
  const expected = signTestWebhook(input.secret, input.timestamp, input.rawBody);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(input.signatureHex.trim(), "hex");
  if (a.length !== b.length || a.length === 0) {
    return { ok: false, category: "INVALID_SIGNATURE" };
  }
  if (!timingSafeEqual(a, b)) {
    return { ok: false, category: "INVALID_SIGNATURE" };
  }
  return { ok: true, category: null };
}

export function verifyTestAdapterWebhook(
  input: RawWebhookInput,
  secret: string,
): VerifiedWebhookResult {
  const timestamp = input.headers["x-kccc-timestamp"] ?? "";
  const signature = input.headers["x-kccc-signature"] ?? "";
  const check = verifyHmacSha256Signature({
    secret,
    timestamp,
    rawBody: input.rawBody,
    signatureHex: signature,
    receivedAtIso: input.receivedAtIso,
  });
  let providerEventId: string | null = null;
  let providerEventAt: string | null = null;
  let events: VerifiedWebhookResult["events"] = [];
  try {
    const parsed = JSON.parse(input.rawBody) as {
      eventId?: string;
      occurredAt?: string;
      events?: Array<{
        type?: string;
        providerMessageId?: string;
        occurredAt?: string;
      }>;
    };
    providerEventId = typeof parsed.eventId === "string" ? parsed.eventId : null;
    providerEventAt =
      typeof parsed.occurredAt === "string" ? parsed.occurredAt : null;
    events = (parsed.events ?? []).map((e) => ({
      type: String(e.type ?? "UNKNOWN"),
      providerMessageId: e.providerMessageId ?? null,
      occurredAt: e.occurredAt ?? providerEventAt ?? input.receivedAtIso,
    }));
  } catch {
    return {
      ok: false,
      providerKey: input.providerKey,
      providerEventId: null,
      providerEventAt: null,
      replayFingerprint: webhookReplayFingerprint(
        input.providerKey,
        null,
        input.rawBody,
      ),
      signatureValid: false,
      rejectionCategory: "INVALID_JSON",
      events: [],
    };
  }

  const replayFingerprint = webhookReplayFingerprint(
    input.providerKey,
    providerEventId,
    input.rawBody,
  );

  if (!check.ok) {
    return {
      ok: false,
      providerKey: input.providerKey,
      providerEventId,
      providerEventAt,
      replayFingerprint,
      signatureValid: false,
      rejectionCategory: check.category,
      events: [],
    };
  }

  return {
    ok: true,
    providerKey: input.providerKey,
    providerEventId,
    providerEventAt,
    replayFingerprint,
    signatureValid: true,
    rejectionCategory: null,
    events,
  };
}

export function normalizeTestWebhookEvents(
  verified: VerifiedWebhookResult,
): NormalizedDeliveryEvent[] {
  if (!verified.ok) return [];
  return verified.events.map((e) => {
    const type = e.type.toUpperCase();
    if (type === "DELIVERED") {
      return {
        eventType: "DELIVERED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "NONE",
      };
    }
    if (type === "BOUNCED_PERMANENT") {
      return {
        eventType: "BOUNCED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "INVALID_DESTINATION",
      };
    }
    if (type === "BOUNCED_TEMPORARY") {
      return {
        eventType: "FAILED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "TEMPORARY_NO_SUPPRESSION",
      };
    }
    if (type === "COMPLAINT") {
      return {
        eventType: "COMPLAINT",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "COMPLAINT",
      };
    }
    if (type === "UNSUBSCRIBED") {
      return {
        eventType: "UNSUBSCRIBED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "CHANNEL_OPT_OUT",
      };
    }
    if (type === "ACCEPTED") {
      return {
        eventType: "DISPATCH_ACCEPTED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "NONE",
      };
    }
    if (type === "REJECTED") {
      return {
        eventType: "DISPATCH_REJECTED",
        providerMessageId: e.providerMessageId,
        occurredAt: e.occurredAt,
        suppressionAction: "NONE",
      };
    }
    return {
      eventType: "UNSUPPORTED",
      providerMessageId: e.providerMessageId,
      occurredAt: e.occurredAt,
      suppressionAction: "NONE",
    };
  });
}
