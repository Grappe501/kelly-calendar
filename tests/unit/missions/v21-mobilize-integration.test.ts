import { describe, expect, it } from "vitest";
import {
  assertAllowlistedMobilizeUrl,
  assertMobilizeDoesNotMutateMissions,
  buildBaseCapabilityReport,
  fingerprintPayload,
  mobilizeConfigStatus,
  MobilizeTransportError,
  normalizeEvent,
  normalizePerson,
  reconcileMobilizeEvents,
  redactMobilizeDiagnostics,
  resolveMobilizeApiBaseUrl,
  withReadRetries,
  MOBILIZE_DOCS,
} from "@/features/mobilize-integration";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";

describe("V2.1 Mobilize Integration Foundation", () => {
  it("records official documentation revision and rate limits", () => {
    expect(MOBILIZE_DOCS.apiBaseUrl).toBe("https://api.mobilize.us/v1");
    expect(MOBILIZE_DOCS.documentationRevisionShort).toBe("1025d0f");
    expect(MOBILIZE_DOCS.rateLimitReadPerSecond).toBe(15);
    expect(MOBILIZE_DOCS.rateLimitWritePerSecond).toBe(5);
    expect(MOBILIZE_DOCS.authentication).toMatch(/Bearer/i);
  });

  it("rejects untrusted API base hosts and non-HTTPS", () => {
    expect(() => resolveMobilizeApiBaseUrl("http://api.mobilize.us/v1")).toThrow(
      /HTTPS/,
    );
    expect(() =>
      resolveMobilizeApiBaseUrl("https://evil.example/v1"),
    ).toThrow(/allowlisted/);
    expect(resolveMobilizeApiBaseUrl(undefined)).toBe(
      "https://api.mobilize.us/v1",
    );
  });

  it("validates pagination next hosts", () => {
    expect(() =>
      assertAllowlistedMobilizeUrl("https://evil.example/v1/events"),
    ).toThrow(/allowlisted/);
    expect(
      assertAllowlistedMobilizeUrl(
        "https://api.mobilize.us/v1/organizations/1/events?cursor=abc",
      ).host,
    ).toBe("api.mobilize.us");
  });

  it("redacts authorization and api keys from diagnostics", () => {
    const redacted = redactMobilizeDiagnostics({
      Authorization: "Bearer SUPERSECRET",
      nested: { mobilize_api_key: "abc", ok: true },
      message: "Bearer SUPERSECRET failed",
    }) as Record<string, unknown>;
    expect(JSON.stringify(redacted)).not.toMatch(/SUPERSECRET/);
    expect(redacted.Authorization).toBe("[REDACTED]");
  });

  it("treats missing key as NOT_CONFIGURED without fabricating connection success", () => {
    const status = mobilizeConfigStatus({
      apiKey: null,
      organizationId: null,
      apiBaseUrl: MOBILIZE_DOCS.apiBaseUrl,
      importEventsEnabled: false,
      publishingEnabled: false,
      updatesEnabled: false,
      deleteEnabled: false,
      defaultContactEmail: null,
      campaignScopeKey: "KELLY",
    });
    expect(status.fullyConfigured).toBe(false);
    expect(status.outboundWritesEnabled).toBe(false);
    expect(buildBaseCapabilityReport("NOT_CONFIGURED").connectionState).toBe(
      "NOT_CONFIGURED",
    );
  });

  it("sends Bearer auth and parses list envelopes via mocked transport", async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const adapter = new MobilizeAdapter({
      apiKey: "test-key-not-real",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "42",
      transport: async (req) => {
        calls.push({ url: req.url, auth: req.headers?.Authorization });
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            data: [
              {
                id: 9,
                title: "Town Hall",
                modified_date: 1700000000,
                timeslots: [{ id: 1, start_date: 1700001000, end_date: 1700004600 }],
                visibility: "PUBLIC",
              },
            ],
            count: 1,
            next: null,
            previous: null,
          }),
        };
      },
    });
    const page = await adapter.listOrganizationEvents({ perPage: 1 });
    expect(calls[0]?.auth).toBe("Bearer test-key-not-real");
    expect(page.data[0]?.id).toBe("9");
    expect(page.data[0]?.title).toBe("Town Hall");
    expect(page.data[0]?.timeslots).toHaveLength(1);
  });

  it("classifies 403 and 429 correctly", async () => {
    const forbidden = new MobilizeAdapter({
      apiKey: "bad",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "1",
      transport: async () => ({
        status: 403,
        headers: {},
        bodyText: "{}",
      }),
    });
    await expect(forbidden.getEnums()).rejects.toMatchObject({
      category: "INVALID_CREDENTIALS",
      status: 403,
    });

    let attempts = 0;
    const limited = await withReadRetries(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          return {
            status: 429,
            headers: { "retry-after": "0" },
            bodyText: "{}",
          };
        }
        return {
          status: 200,
          headers: {} as Record<string, string>,
          bodyText: JSON.stringify({ data: {} }),
        };
      },
      {
        method: "GET",
        url: "https://api.mobilize.us/v1/enums",
      },
      { maxAttempts: 3, random: () => 0 },
    );
    expect(limited.status).toBe(200);
    expect(attempts).toBe(3);
  });

  it("preserves unknown enum-like values during normalization", () => {
    const event = normalizeEvent({
      id: 3,
      title: "Canvass",
      event_type: "BRAND_NEW_TYPE",
      visibility: "MYSTERY",
      modified_date: 1700000000,
      timeslots: [],
      totally_new_field: true,
    });
    expect(event?.eventType).toBe("BRAND_NEW_TYPE");
    expect(event?.visibility).toBe("MYSTERY");
    expect(event?.rawUnknownKeys).toContain("totally_new_field");
  });

  it("detects results_limited_to on list pages", async () => {
    const adapter = new MobilizeAdapter({
      apiKey: "k",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "1",
      transport: async () => ({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          data: [],
          count: 5000,
          next: null,
          previous: null,
          results_limited_to: 1000,
        }),
      }),
    });
    const page = await adapter.listOrganizationEvents();
    expect(page.resultsLimitedTo).toBe(1000);
  });

  it("reconciles by external reference, never title-only auto-apply", () => {
    const remote = [
      normalizeEvent({
        id: 1,
        title: "Same Title",
        modified_date: 1700000000,
        timeslots: [],
      })!,
      normalizeEvent({
        id: 2,
        title: "Same Title",
        modified_date: 1700000001,
        timeslots: [],
      })!,
    ];
    const withoutRef = reconcileMobilizeEvents({
      remoteEvents: remote,
      deletedEvents: [],
      referencesByExternalId: new Map(),
      localEventsByTitle: new Map([["same title", ["local-1"]]]),
    });
    expect(withoutRef.every((c) => c.action === "AMBIGUOUS_MATCH")).toBe(true);

    const fp = remote[0]!.fingerprint;
    const withRef = reconcileMobilizeEvents({
      remoteEvents: [remote[0]!],
      deletedEvents: [],
      referencesByExternalId: new Map([
        [
          "1",
          {
            externalObjectId: "1",
            localObjectType: "Event",
            localObjectId: "evt1",
            contentFingerprint: fp,
            remoteDeletedAt: null,
          },
        ],
      ]),
    });
    expect(withRef[0]?.action).toBe("MATCHED_UNCHANGED");
  });

  it("marks remote deletion without deleting local records", () => {
    const candidates = reconcileMobilizeEvents({
      remoteEvents: [],
      deletedEvents: [{ id: "9", deletedAt: "2026-01-01T00:00:00.000Z" }],
      referencesByExternalId: new Map([
        [
          "9",
          {
            externalObjectId: "9",
            localObjectType: "Event",
            localObjectId: "local-9",
            contentFingerprint: "x",
            remoteDeletedAt: null,
          },
        ],
      ]),
    });
    expect(candidates[0]?.action).toBe("REMOTE_DELETED");
    expect(candidates[0]?.proposedLocalObjectId).toBe("local-9");
    expect(candidates[0]?.changeSummary).toMatch(/preserved/i);
  });

  it("treats people as sensitive aggregate-only and signup ≠ attendance completion", () => {
    const person = normalizePerson({
      id: 7,
      email_addresses: [{ address: "a@example.com" }],
      phone_numbers: [],
    });
    expect(person?.hasEmail).toBe(true);
    expect(JSON.stringify(person)).not.toMatch(/a@example.com/);
    const isolation = assertMobilizeDoesNotMutateMissions();
    expect(isolation.autoCreatesMissions).toBe(false);
    expect(isolation.outboundPublishingEnabled).toBe(false);
    expect(isolation.personLevelApplyEnabled).toBe(false);
    expect(isolation.mutatesExecute).toBe(false);
    expect(isolation.mutatesIncidents).toBe(false);
    expect(fingerprintPayload(["a", "b"])).toHaveLength(64);
  });

  it("write capabilities stay documented but application-disabled", () => {
    const report = buildBaseCapabilityReport("CONNECTED");
    expect(report.outboundWritesForcedDisabled).toBe(true);
    expect(report.capabilities.createEvents.applicationEnabled).toBe(false);
    expect(report.capabilities.deleteEvents.documented).toBe(true);
    expect(report.capabilities.deleteEvents.applicationEnabled).toBe(false);
    expect(report.personLevelApplyEnabled).toBe(false);
  });

  it("surfaces transport errors without leaking secrets", () => {
    const err = new MobilizeTransportError({
      message: "Authorization Bearer SUPERSECRET rejected",
      category: "INVALID_CREDENTIALS",
      status: 403,
    });
    expect(err.message).not.toMatch(/SUPERSECRET/);
  });
});
