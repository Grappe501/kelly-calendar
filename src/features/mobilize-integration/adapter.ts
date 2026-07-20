import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import {
  normalizeAttendance,
  normalizeDeletedEvent,
  normalizeEvent,
  normalizeOrganization,
  normalizePerson,
} from "@/features/mobilize-integration/normalize";
import { safeErrorSummary } from "@/features/mobilize-integration/redact";
import {
  assertAllowlistedMobilizeUrl,
  createFetchTransport,
  createRateLimitedTransport,
  MobilizeTransportError,
  withReadRetries,
  type MobilizeTransport,
} from "@/features/mobilize-integration/transport";
import type {
  MobilizeListPage,
  NormalizedMobilizeAttendance,
  NormalizedMobilizeDeletedEvent,
  NormalizedMobilizeEvent,
  NormalizedMobilizeOrganization,
  NormalizedMobilizePerson,
} from "@/features/mobilize-integration/types";

export type MobilizeAdapterConfig = {
  apiKey: string;
  apiBaseUrl: string;
  organizationId: string;
  transport?: MobilizeTransport;
  correlationId?: string;
};

type Envelope = {
  data: unknown;
  error?: unknown;
  count?: number | null;
  next?: string | null;
  previous?: string | null;
  results_limited_to?: number | null;
};

function classifyHttpError(status: number, bodyText: string): MobilizeTransportError {
  if (status === 403) {
    return new MobilizeTransportError({
      message: "Mobilize rejected credentials or access (403).",
      category: "INVALID_CREDENTIALS",
      status,
    });
  }
  if (status === 429) {
    return new MobilizeTransportError({
      message: "Mobilize rate limit exceeded (429).",
      category: "RATE_LIMITED",
      status,
      retryable: true,
    });
  }
  if (status >= 500) {
    return new MobilizeTransportError({
      message: `Mobilize unavailable (${status}).`,
      category: "UNAVAILABLE",
      status,
      retryable: true,
    });
  }
  return new MobilizeTransportError({
    message: safeErrorSummary(`Mobilize HTTP ${status}: ${bodyText.slice(0, 120)}`),
    category: "UNKNOWN",
    status,
  });
}

export class MobilizeAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly organizationId: string;
  private readonly transport: MobilizeTransport;
  private readonly correlationId: string;
  rateLimitObserved = false;

  constructor(config: MobilizeAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, "");
    this.organizationId = config.organizationId;
    this.transport =
      config.transport ??
      createRateLimitedTransport(createFetchTransport(), {
        maxReadsPerSecond: 8,
        lastRequestAt: 0,
      });
    this.correlationId = config.correlationId ?? `mbl-${Date.now()}`;
  }

  get orgId() {
    return this.organizationId;
  }

  private resolveUrl(pathOrAbsolute: string): string {
    const url = pathOrAbsolute.startsWith("http")
      ? assertAllowlistedMobilizeUrl(pathOrAbsolute).toString()
      : `${this.baseUrl}${pathOrAbsolute.startsWith("/") ? "" : "/"}${pathOrAbsolute}`;
    assertAllowlistedMobilizeUrl(url);
    return url;
  }

  private parseEnvelope(status: number, bodyText: string): Envelope {
    let parsed: Envelope;
    try {
      parsed = JSON.parse(bodyText) as Envelope;
    } catch {
      throw new MobilizeTransportError({
        message: "Malformed Mobilize JSON response.",
        category: "PARSE",
        status,
      });
    }
    if (parsed.error) {
      throw new MobilizeTransportError({
        message: "Mobilize returned an error envelope.",
        category: "VALIDATION",
        status,
      });
    }
    return parsed;
  }

  private async getJson(pathOrAbsolute: string): Promise<Envelope> {
    const url = this.resolveUrl(pathOrAbsolute);

    const res = await withReadRetries(this.transport, {
      method: "GET",
      url,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "X-Request-Id": this.correlationId,
      },
      timeoutMs: 20_000,
    });

    if (res.status === 429) this.rateLimitObserved = true;
    if (res.status >= 400) throw classifyHttpError(res.status, res.bodyText);
    return this.parseEnvelope(res.status, res.bodyText);
  }

  /**
   * Single-shot write — never blindly retries CREATE.
   * Caller must handle UNKNOWN_REMOTE_OUTCOME on timeout.
   */
  private async writeJsonOnce(input: {
    method: "POST" | "PUT" | "DELETE";
    path: string;
    body?: unknown;
  }): Promise<{ status: number; envelope: Envelope | null; bodyText: string }> {
    const url = this.resolveUrl(input.path);
    const res = await this.transport({
      method: input.method,
      url,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Request-Id": this.correlationId,
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      timeoutMs: 30_000,
    });
    if (res.status === 429) this.rateLimitObserved = true;
    if (res.status >= 400) throw classifyHttpError(res.status, res.bodyText);
    if (input.method === "DELETE" && res.status === 200) {
      return { status: res.status, envelope: null, bodyText: res.bodyText };
    }
    if (!res.bodyText.trim()) {
      return { status: res.status, envelope: null, bodyText: res.bodyText };
    }
    return {
      status: res.status,
      envelope: this.parseEnvelope(res.status, res.bodyText),
      bodyText: res.bodyText,
    };
  }

  private mapPage<T>(
    envelope: Envelope,
    mapOne: (row: Record<string, unknown>) => T | null,
  ): MobilizeListPage<T> {
    const rows = Array.isArray(envelope.data)
      ? envelope.data
      : envelope.data
        ? [envelope.data]
        : [];
    const data = rows
      .map((row) =>
        row && typeof row === "object"
          ? mapOne(row as Record<string, unknown>)
          : null,
      )
      .filter(Boolean) as T[];
    return {
      data,
      count: typeof envelope.count === "number" ? envelope.count : null,
      next: envelope.next ?? null,
      previous: envelope.previous ?? null,
      resultsLimitedTo:
        typeof envelope.results_limited_to === "number"
          ? envelope.results_limited_to
          : null,
    };
  }

  async listPromotedOrganizations(): Promise<
    MobilizeListPage<NormalizedMobilizeOrganization>
  > {
    const envelope = await this.getJson(
      `/organizations/${this.organizationId}/promoted_organizations`,
    );
    return this.mapPage(envelope, normalizeOrganization);
  }

  async listOrganizationEvents(options?: {
    nextUrl?: string | null;
    perPage?: number;
  }): Promise<MobilizeListPage<NormalizedMobilizeEvent>> {
    const path =
      options?.nextUrl ??
      `/organizations/${this.organizationId}/events?per_page=${options?.perPage ?? MOBILIZE_DOCS.pagination.perPageDefault}`;
    const envelope = await this.getJson(path);
    return this.mapPage(envelope, normalizeEvent);
  }

  async getOrganizationEvent(
    eventId: string,
  ): Promise<NormalizedMobilizeEvent | null> {
    const envelope = await this.getJson(
      `/organizations/${this.organizationId}/events/${eventId}`,
    );
    const raw = envelope.data;
    if (!raw || typeof raw !== "object") return null;
    return normalizeEvent(raw as Record<string, unknown>);
  }

  async listDeletedOrganizationEvents(options?: {
    nextUrl?: string | null;
  }): Promise<MobilizeListPage<NormalizedMobilizeDeletedEvent>> {
    const path =
      options?.nextUrl ??
      `/organizations/${this.organizationId}/events/deleted?per_page=25`;
    const envelope = await this.getJson(path);
    return this.mapPage(envelope, normalizeDeletedEvent);
  }

  async listPeople(options?: {
    nextUrl?: string | null;
  }): Promise<MobilizeListPage<NormalizedMobilizePerson>> {
    const path =
      options?.nextUrl ??
      `/organizations/${this.organizationId}/people?per_page=25`;
    const envelope = await this.getJson(path);
    return this.mapPage(envelope, normalizePerson);
  }

  async listAttendances(options?: {
    nextUrl?: string | null;
  }): Promise<MobilizeListPage<NormalizedMobilizeAttendance>> {
    const path =
      options?.nextUrl ??
      `/organizations/${this.organizationId}/attendances?per_page=25`;
    const envelope = await this.getJson(path);
    return this.mapPage(envelope, normalizeAttendance);
  }

  async listEventAttendances(
    eventId: string,
    options?: { nextUrl?: string | null },
  ): Promise<MobilizeListPage<NormalizedMobilizeAttendance>> {
    const path =
      options?.nextUrl ??
      `/organizations/${this.organizationId}/events/${eventId}/attendances?per_page=25`;
    const envelope = await this.getJson(path);
    return this.mapPage(envelope, normalizeAttendance);
  }

  async getEnums(): Promise<Record<string, unknown>> {
    const envelope = await this.getJson(`/enums`);
    return (envelope.data && typeof envelope.data === "object"
      ? envelope.data
      : {}) as Record<string, unknown>;
  }

  /**
   * Create organization event. Caller must gate by publishing flags.
   * Does not retry — ambiguous timeouts must reconcile before any retry.
   */
  async createOrganizationEvent(
    payload: Record<string, unknown>,
  ): Promise<NormalizedMobilizeEvent> {
    const result = await this.writeJsonOnce({
      method: "POST",
      path: `/organizations/${this.organizationId}/events`,
      body: payload,
    });
    const raw = result.envelope?.data;
    if (!raw || typeof raw !== "object") {
      throw new MobilizeTransportError({
        message: "Malformed Mobilize create response — no event object.",
        category: "PARSE",
        status: result.status,
      });
    }
    const normalized = normalizeEvent(raw as Record<string, unknown>);
    if (!normalized?.id) {
      throw new MobilizeTransportError({
        message: "Malformed Mobilize create response — missing event id.",
        category: "PARSE",
        status: result.status,
      });
    }
    return normalized;
  }

  /**
   * Update organization event. Full-document PUT per Mobilize docs.
   * Does not blind-retry; caller revalidates fingerprints first.
   */
  async updateOrganizationEvent(
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<NormalizedMobilizeEvent> {
    const result = await this.writeJsonOnce({
      method: "PUT",
      path: `/organizations/${this.organizationId}/events/${eventId}?send_update_notifications=false`,
      body: payload,
    });
    const raw = result.envelope?.data;
    if (!raw || typeof raw !== "object") {
      throw new MobilizeTransportError({
        message: "Malformed Mobilize update response — no event object.",
        category: "PARSE",
        status: result.status,
      });
    }
    const normalized = normalizeEvent(raw as Record<string, unknown>);
    if (!normalized?.id) {
      throw new MobilizeTransportError({
        message: "Malformed Mobilize update response — missing event id.",
        category: "PARSE",
        status: result.status,
      });
    }
    return normalized;
  }

  /**
   * Delete is disabled by default at the application layer.
   * Adapter method exists for guarded future use only.
   */
  async deleteOrganizationEvent(eventId: string): Promise<void> {
    await this.writeJsonOnce({
      method: "DELETE",
      path: `/organizations/${this.organizationId}/events/${eventId}?send_update_notifications=false`,
    });
  }
}
