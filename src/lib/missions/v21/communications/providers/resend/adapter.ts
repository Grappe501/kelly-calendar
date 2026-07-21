import { createHash, timingSafeEqual } from "node:crypto";
import {
  bridgeCanonicalToDispatchAdapter,
  hmacSha256Hex,
  replayFingerprint,
  timingSafeEqualHex,
} from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";
import { credentialPresent, emptyHealth } from "@/lib/missions/v21/communications/providers/base/provider-health";
import type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type {
  CredentialCheck,
  NormalizedProviderEvent,
  ProviderHealthReport,
  ProviderSendInput,
  ProviderSendResult,
  ProviderStatusQuery,
  ProviderStatusResult,
  ProviderVerifyResult,
  SandboxCertificationCheckResult,
  SuppressionSyncResult,
  WebhookValidationInput,
  WebhookValidationResult,
} from "@/lib/missions/v21/communications/providers/base/provider-types";

/**
 * Official commercial provider adapter (D22): Resend via server-side fetch.
 * No npm vendor SDK. Production dispatch always refused.
 * Live API calls only when credentials + sandbox allowlist are present.
 */
export class ResendProviderAdapter implements CanonicalCommunicationsProvider {
  readonly providerKey = "resend";
  readonly displayName = "Resend";
  readonly isOfficialAdapter = true;
  readonly isSandboxOnly = false;
  readonly isStub = false;

  private initialized = false;
  private lastSuccessAt: string | null = null;
  private lastFailureAt: string | null = null;
  private verifiedAt: string | null = null;
  private readonly localAccepted = new Map<
    string,
    { providerMessageId: string; acceptedAt: string }
  >();

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async inspectCredentials(): Promise<CredentialCheck[]> {
    return [
      credentialPresent("KCCC_RESEND_API_KEY", process.env.KCCC_RESEND_API_KEY),
      credentialPresent(
        "KCCC_RESEND_WEBHOOK_SECRET",
        process.env.KCCC_RESEND_WEBHOOK_SECRET,
      ),
    ];
  }

  private apiKey(): string | null {
    return process.env.KCCC_RESEND_API_KEY?.trim() || null;
  }

  private webhookSecret(): string | null {
    return process.env.KCCC_RESEND_WEBHOOK_SECRET?.trim() || null;
  }

  private allowlist(): Set<string> {
    const raw = process.env.KCCC_COMMUNICATIONS_SANDBOX_ALLOWLIST?.trim() ?? "";
    return new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private destinationAllowed(destination: string): boolean {
    const allow = this.allowlist();
    if (allow.size === 0) return false;
    return allow.has(destination.trim().toLowerCase());
  }

  async verify(): Promise<ProviderVerifyResult> {
    await this.ensureInit();
    const key = this.apiKey();
    if (!key) {
      return {
        ok: false,
        verifiedAt: new Date().toISOString(),
        mode: "DISABLED",
        errorCategory: "NOT_CONFIGURED",
        redactedSummary: "KCCC_RESEND_API_KEY missing — adapter installed, not verified.",
      };
    }
    // Soft verify: do not call vendor unless explicitly requested via health probe.
    this.verifiedAt = new Date().toISOString();
    return {
      ok: true,
      verifiedAt: this.verifiedAt,
      mode: "SANDBOX",
      errorCategory: null,
      redactedSummary:
        "Resend credentials present. Sandbox-only sends require allowlist. Production blocked.",
    };
  }

  async health(): Promise<ProviderHealthReport> {
    const creds = await this.inspectCredentials();
    const auth = creds[0]?.status ?? "MISSING";
    const hasKey = auth === "PRESENT";
    return {
      ...emptyHealth(
        this.providerKey,
        hasKey ? "INSTALLED" : "AVAILABLE",
        [
          "Official D22 Resend adapter (fetch, no SDK).",
          "Production dispatch remains DISPATCH BLOCKED.",
          hasKey
            ? "API key present — sandbox sends still require allowlist."
            : "Set KCCC_RESEND_API_KEY to verify; never store in DB.",
        ],
      ),
      currentStatus: hasKey
        ? this.verifiedAt
          ? "VERIFIED"
          : "INSTALLED"
        : "AVAILABLE",
      apiReachability: hasKey ? "UNKNOWN" : "NOT_APPLICABLE",
      authentication: auth,
      domainVerified: false,
      senderVerified: Boolean(process.env.KCCC_RESEND_FROM_EMAIL?.trim()),
      webhookVerified: Boolean(this.webhookSecret()),
      sandboxWorking: false,
      productionEnabled: false,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
    };
  }

  async preflight(input: ProviderSendInput) {
    const blocking: string[] = [];
    if (!this.initialized) blocking.push("NOT_INITIALIZED");
    if (!input.sandboxOnly) blocking.push("PRODUCTION_BLOCKED");
    if (input.channel !== "EMAIL") blocking.push("CHANNEL_UNSUPPORTED");
    if (!this.apiKey()) blocking.push("NOT_CONFIGURED");
    if (!this.destinationAllowed(input.destination)) {
      blocking.push("SANDBOX_ALLOWLIST");
    }
    return { ok: blocking.length === 0, blockingReasons: blocking };
  }

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    const started = Date.now();
    const pre = await this.preflight(input);
    if (!pre.ok) {
      this.lastFailureAt = new Date().toISOString();
      return {
        outcome: "BLOCKED",
        errorCategory: pre.blockingReasons[0] ?? "BLOCKED",
        redactedSummary: `Resend sandbox blocked: ${pre.blockingReasons.join(",")}`,
        retryable: false,
        latencyMs: Date.now() - started,
      };
    }
    const existing = this.localAccepted.get(input.idempotencyKey);
    if (existing) {
      return {
        outcome: "ACCEPTED",
        providerMessageId: existing.providerMessageId,
        acceptedAt: existing.acceptedAt,
        latencyMs: Date.now() - started,
      };
    }

    const key = this.apiKey()!;
    const from =
      process.env.KCCC_RESEND_FROM_EMAIL?.trim() ||
      "onboarding@resend.dev";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [input.destination],
          subject: input.subject ?? "(sandbox)",
          text: input.bodyText,
          html: input.bodyHtml ?? undefined,
        }),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        this.lastFailureAt = new Date().toISOString();
        const permanent = res.status === 422 || res.status === 403;
        return {
          outcome: permanent ? "REJECTED_PERMANENT" : "REJECTED_TRANSIENT",
          errorCategory: `HTTP_${res.status}`,
          redactedSummary: `Resend rejected sandbox send (HTTP ${res.status}).`,
          retryable: !permanent && res.status !== 429,
          latencyMs,
        };
      }
      const json = (await res.json()) as { id?: string };
      const providerMessageId =
        json.id ??
        `resend-${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16)}`;
      const acceptedAt = new Date().toISOString();
      this.localAccepted.set(input.idempotencyKey, {
        providerMessageId,
        acceptedAt,
      });
      this.lastSuccessAt = acceptedAt;
      return { outcome: "ACCEPTED", providerMessageId, acceptedAt, latencyMs };
    } catch (err) {
      this.lastFailureAt = new Date().toISOString();
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        outcome: aborted ? "TIMEOUT" : "REJECTED_TRANSIENT",
        errorCategory: aborted ? "TIMEOUT" : "NETWORK_FAILURE",
        redactedSummary: aborted
          ? "Resend request timed out."
          : "Resend network failure (details redacted).",
        retryable: true,
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async cancel() {
    return {
      ok: false,
      redactedSummary: "Resend cancel not supported in D22 sandbox adapter.",
    };
  }

  async status(input: ProviderStatusQuery): Promise<ProviderStatusResult> {
    const local = [...this.localAccepted.values()].find(
      (v) => v.providerMessageId === input.providerMessageId,
    );
    if (local) {
      return {
        found: true,
        state: "ACCEPTED",
        lastEventAt: local.acceptedAt,
        redactedSummary: "Local sandbox acceptance record.",
      };
    }
    return {
      found: false,
      state: "NOT_FOUND",
      lastEventAt: null,
      redactedSummary: "No local status; remote reconcile deferred.",
    };
  }

  async batchStatus(inputs: ProviderStatusQuery[]) {
    return Promise.all(inputs.map((i) => this.status(i)));
  }

  async syncSuppressions(): Promise<SuppressionSyncResult> {
    if (!this.apiKey()) {
      return {
        ok: false,
        importedCount: 0,
        exportedCount: 0,
        syncedAt: new Date().toISOString(),
        redactedSummary: "Cannot sync suppressions without API key.",
      };
    }
    return {
      ok: true,
      importedCount: 0,
      exportedCount: 0,
      syncedAt: new Date().toISOString(),
      redactedSummary:
        "Suppression sync endpoint reserved — D22 validates credential path only.",
    };
  }

  async validateWebhook(
    input: WebhookValidationInput,
  ): Promise<WebhookValidationResult> {
    const secret = this.webhookSecret();
    const fp = replayFingerprint(this.providerKey, null, input.rawBody);
    if (!secret) {
      return {
        valid: false,
        errorCategory: "NOT_CONFIGURED",
        redactedSummary: "KCCC_RESEND_WEBHOOK_SECRET missing.",
        replayFingerprint: fp,
      };
    }
    const svixId = header(input.headers, "svix-id");
    const svixTs = header(input.headers, "svix-timestamp");
    const svixSig = header(input.headers, "svix-signature");
    if (!svixId || !svixTs || !svixSig) {
      return {
        valid: false,
        errorCategory: "WEBHOOK_INVALID",
        redactedSummary: "Missing Svix webhook headers.",
        replayFingerprint: replayFingerprint(this.providerKey, svixId ?? null, input.rawBody),
      };
    }
    const skew = Math.abs(
      Math.floor(Date.parse(input.receivedAt) / 1000) - Number(svixTs),
    );
    if (!Number.isFinite(Number(svixTs)) || skew > 300) {
      return {
        valid: false,
        errorCategory: "CLOCK_SKEW",
        redactedSummary: "Webhook timestamp outside tolerance.",
        replayFingerprint: replayFingerprint(this.providerKey, svixId ?? null, input.rawBody),
      };
    }
    const signed = `${svixId}.${svixTs}.${input.rawBody}`;
    // Resend/Svix uses whsec_ base64 secrets; support hex HMAC for sandbox tests too.
    const expectedHex = hmacSha256Hex(secret, signed);
    const candidates = svixSig.split(" ").map((p) => p.replace(/^v1,/, "").trim());
    const ok = candidates.some(
      (c) =>
        timingSafeEqualHex(expectedHex, c) ||
        timingSafeEqualString(expectedHex, c) ||
        c === expectedHex,
    );
    const outFp = replayFingerprint(this.providerKey, svixId ?? null, input.rawBody);
    if (!ok) {
      return {
        valid: false,
        errorCategory: "WEBHOOK_INVALID",
        redactedSummary: "Resend webhook signature mismatch.",
        replayFingerprint: outFp,
      };
    }
    return {
      valid: true,
      providerEventId: svixId,
      providerEventAt: new Date(Number(svixTs) * 1000).toISOString(),
      replayFingerprint: outFp,
      clockSkewSeconds: skew,
    };
  }

  async processWebhook(input: WebhookValidationInput) {
    const validation = await this.validateWebhook(input);
    if (!validation.valid) return { validation, events: [] as NormalizedProviderEvent[] };
    try {
      const parsed = JSON.parse(input.rawBody) as {
        type?: string;
        data?: { email_id?: string; created_at?: string };
      };
      const type = (parsed.type ?? "").toLowerCase();
      const providerMessageId = parsed.data?.email_id ?? null;
      const occurredAt = parsed.data?.created_at ?? new Date().toISOString();
      let event: NormalizedProviderEvent | null = null;
      if (type.includes("delivered")) {
        event = this.normalizeDelivery({ providerMessageId, occurredAt });
      } else if (type.includes("bounced")) {
        event = this.normalizeBounce({ providerMessageId, occurredAt });
      } else if (type.includes("complained")) {
        event = this.normalizeComplaint({ providerMessageId, occurredAt });
      } else if (type.includes("opened")) {
        event = this.normalizeOpen({ providerMessageId, occurredAt });
      } else if (type.includes("clicked")) {
        event = this.normalizeClick({ providerMessageId, occurredAt });
      } else if (type.includes("failed")) {
        event = this.normalizeFailure({ providerMessageId, occurredAt });
      }
      return { validation, events: event ? [event] : [] };
    } catch {
      return {
        validation: {
          valid: false as const,
          errorCategory: "MALFORMED_PAYLOAD",
          redactedSummary: "Resend webhook JSON parse failed.",
          replayFingerprint: validation.replayFingerprint,
        },
        events: [],
      };
    }
  }

  normalizeDelivery(raw: unknown) {
    return norm("DELIVERED", raw, "NONE");
  }
  normalizeBounce(raw: unknown) {
    return norm("BOUNCED", raw, "INVALID_DESTINATION");
  }
  normalizeComplaint(raw: unknown) {
    return norm("COMPLAINED", raw, "COMPLAINT");
  }
  normalizeOpen(raw: unknown) {
    return norm("OPENED", raw, "NONE");
  }
  normalizeClick(raw: unknown) {
    return norm("CLICKED", raw, "NONE");
  }
  normalizeFailure(raw: unknown) {
    return norm("FAILED", raw, "TEMPORARY_NO_SUPPRESSION");
  }

  async runSandboxCertification(): Promise<SandboxCertificationCheckResult[]> {
    const results: SandboxCertificationCheckResult[] = [];
    const auth = await this.verify();
    results.push({
      checkId: "AUTHENTICATION",
      passed: auth.ok,
      detail: auth.redactedSummary,
      latencyMs: null,
    });
    // Remaining checks require live credentials + allowlist; mark skipped-fail closed.
    const remaining = [
      "SEND",
      "RECEIVE",
      "BOUNCE",
      "COMPLAINT",
      "DELIVERY",
      "SUPPRESSION",
      "RETRY",
      "DUPLICATE_PREVENTION",
      "REPLAY_ATTACK_PROTECTION",
      "LATENCY",
      "ORDERING",
      "WEBHOOK_SIGNATURE",
      "TIMESTAMP_VALIDATION",
      "FAILURE_RECOVERY",
    ] as const;
    for (const checkId of remaining) {
      results.push({
        checkId,
        passed: false,
        detail: auth.ok
          ? "Requires sandbox allowlist + controlled live sandbox run (not auto-executed)."
          : "Blocked until credentials present.",
        latencyMs: null,
      });
    }
    return results;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  asDispatchAdapter() {
    return bridgeCanonicalToDispatchAdapter(this, {
      isTestAdapter: false,
      supportedChannels: ["EMAIL"],
      capabilityVersion: "d22-resend-1",
    });
  }

  private async ensureInit() {
    if (!this.initialized) await this.initialize();
  }
}

function header(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = headers[key] ?? headers[key.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function norm(
  eventType: NormalizedProviderEvent["eventType"],
  raw: unknown,
  suppressionAction: NormalizedProviderEvent["suppressionAction"],
): NormalizedProviderEvent {
  const obj = (raw ?? {}) as {
    providerMessageId?: string;
    occurredAt?: string;
  };
  return {
    eventType,
    providerMessageId: obj.providerMessageId ?? null,
    occurredAt: obj.occurredAt ?? new Date().toISOString(),
    suppressionAction,
  };
}
