import { describe, expect, it } from "vitest";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import {
  assertMobilizePublishingIsolation,
  assessMobilizePublishEligibility,
  assertPayloadHasNoSensitiveKeys,
  buildCreateIdempotencyKey,
  classifyCreateOutcome,
  classifyThreeWayField,
  compareThreeWayDocuments,
  mapLocalEventToMobilizeDocument,
  reconcileTimeslots,
  toMobilizeWirePayload,
  validatePublicationApproval,
  MOBILIZE_MAPPING_VERSION,
} from "@/features/mobilize-integration/publishing";
import {
  mobilizeConfigStatus,
  MOBILIZE_DOCS,
} from "@/features/mobilize-integration";
import type { LocalEventForPublish } from "@/features/mobilize-integration/publishing";

function sampleEvent(overrides: Partial<LocalEventForPublish> = {}): LocalEventForPublish {
  return {
    id: "evt_1",
    eventNumber: "E-1",
    internalTitle: "INTERNAL ONLY",
    campaignDisplayTitle: "Neighborhood Canvass",
    publicTitle: "Join our canvass",
    eventType: "CANVASS",
    status: "CONFIRMED",
    archivedAt: null,
    startsAt: "2026-08-01T15:00:00.000Z",
    endsAt: "2026-08-01T17:00:00.000Z",
    timezone: "America/Chicago",
    defaultVisibility: "PUBLIC",
    locationDisclosure: "VENUE",
    venueName: "Library",
    streetAddress: "100 Main",
    addressLine2: null,
    city: "Little Rock",
    state: "Arkansas",
    postalCode: "72201",
    locationNotes: "secret staging",
    virtualMeetingUrl: null,
    publicDescription: "<p>Public copy</p>",
    campaignDescription: "campaign-only ops copy",
    privateNotes: "do not publish",
    expectedAttendance: 20,
    sensitivityLevel: "NORMAL",
    ...overrides,
  };
}

describe("V2.1 Mobilize Event Publishing (D17)", () => {
  it("records D17 documentation revision and write endpoints", () => {
    expect(MOBILIZE_DOCS.documentationRevisionShort).toBe("1025d0f");
    expect(MOBILIZE_DOCS.d17InspectionDate).toBe("2026-07-20");
    expect(MOBILIZE_DOCS.writeEndpoints.createEvent).toMatch(/POST/);
    expect(MOBILIZE_DOCS.writeEndpoints.updateEvent).toMatch(/PUT/);
    expect(MOBILIZE_DOCS.writeEndpoints.deleteEvent).toMatch(/DELETE/);
    expect(MOBILIZE_DOCS.mappingVersion).toBe("kccc-mobilize-map-d17.1");
    expect(MOBILIZE_MAPPING_VERSION).toBe(MOBILIZE_DOCS.mappingVersion);
  });

  it("maps eligible Event with privacy omissions and stable fingerprints", () => {
    const mapped = mapLocalEventToMobilizeDocument(sampleEvent(), {
      contactEmail: "ops@example.com",
      eventType: "CANVASS",
      visibility: "PUBLIC",
    });
    expect(mapped.document).not.toBeNull();
    expect(mapped.document?.title).toBe("Join our canvass");
    expect(JSON.stringify(mapped.document)).not.toMatch(/INTERNAL ONLY/);
    expect(JSON.stringify(mapped.document)).not.toMatch(/do not publish/);
    expect(JSON.stringify(mapped.document)).not.toMatch(/campaign-only/);
    expect(JSON.stringify(mapped.document)).not.toMatch(/secret staging/);
    expect(mapped.privacyWarnings.length).toBeGreaterThan(0);
    expect(mapped.localFingerprint).toHaveLength(64);
    expect(mapped.payloadFingerprint).toHaveLength(64);
    const wire = toMobilizeWirePayload(mapped.document!);
    expect(assertPayloadHasNoSensitiveKeys(wire)).toEqual([]);
    expect(wire.timeslots).toHaveLength(1);
    expect((wire.timeslots as Array<{ start_date: number }>)[0]?.start_date).toBe(
      Math.floor(Date.parse("2026-08-01T15:00:00.000Z") / 1000),
    );
  });

  it("blocks unsupported / unknown event types and missing contact", () => {
    const unknown = mapLocalEventToMobilizeDocument(
      sampleEvent({ eventType: "BRAND_NEW_FUTURE_TYPE" }),
      { contactEmail: "ops@example.com" },
    );
    expect(unknown.document).toBeNull();
    expect(
      unknown.fields.find((f) => f.field === "event_type")?.status,
    ).toBe("REQUIRES_DECISION");

    const advocacy = mapLocalEventToMobilizeDocument(sampleEvent(), {
      eventType: "ADVOCACY_CALL",
      contactEmail: "ops@example.com",
    });
    expect(
      advocacy.fields.find((f) => f.field === "event_type")?.status,
    ).toBe("UNSUPPORTED");
  });

  it("handles virtual events, cross-midnight, and timezone allowlist", () => {
    const virtual = mapLocalEventToMobilizeDocument(
      sampleEvent({
        virtualMeetingUrl: "https://example.com/meet",
        postalCode: null,
      }),
      {
        contactEmail: "ops@example.com",
        isVirtual: true,
        eventType: "MEETING",
        visibility: "PRIVATE",
      },
    );
    expect(virtual.document?.is_virtual).toBe(true);
    expect(virtual.document?.virtual_action_url).toContain("example.com");
    expect(virtual.document?.location).toBeUndefined();

    const overnight = mapLocalEventToMobilizeDocument(
      sampleEvent({
        startsAt: "2026-08-01T23:00:00.000Z",
        endsAt: "2026-08-02T01:00:00.000Z",
      }),
      { contactEmail: "ops@example.com", visibility: "PUBLIC" },
    );
    expect(overnight.document).not.toBeNull();
    expect(overnight.document!.timeslots[0]!.end_date).toBeGreaterThan(
      overnight.document!.timeslots[0]!.start_date,
    );

    const badTz = mapLocalEventToMobilizeDocument(
      sampleEvent({ timezone: "Europe/Paris" }),
      { contactEmail: "ops@example.com" },
    );
    expect(badTz.document).toBeNull();
  });

  it("eligibility separates blocking, privacy, and NOT_CONFIGURED info", () => {
    const result = assessMobilizePublishEligibility({
      event: sampleEvent(),
      campaignAuthorized: true,
      connectionState: "NOT_CONFIGURED",
      organizationId: null,
      expectedOrganizationId: null,
      publishingEnabled: false,
      updatesEnabled: false,
      hasActiveMobilizeReference: false,
      unresolvedConflict: false,
      mappingOptions: {
        contactEmail: "ops@example.com",
        eventType: "CANVASS",
        visibility: "PUBLIC",
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.action).toBe("CREATE");
    expect(result.issues.some((i) => i.code === "NOT_CONFIGURED")).toBe(true);
    expect(result.issues.some((i) => i.severity === "privacy")).toBe(true);

    const cancelled = assessMobilizePublishEligibility({
      event: sampleEvent({ status: "CANCELLED" }),
      campaignAuthorized: true,
      connectionState: "CONNECTED",
      organizationId: "1",
      expectedOrganizationId: "1",
      publishingEnabled: true,
      updatesEnabled: true,
      hasActiveMobilizeReference: true,
      unresolvedConflict: false,
      mappingOptions: {
        contactEmail: "ops@example.com",
        visibility: "PUBLIC",
      },
    });
    expect(cancelled.eligible).toBe(false);
    expect(cancelled.issues.some((i) => i.code === "EVENT_CANCELLED_BLOCK")).toBe(
      true,
    );
  });

  it("approval binds fingerprints and rejects stale/consumed approvals", () => {
    const base = {
      eventId: "evt_1",
      actionType: "CREATE" as const,
      mappingVersion: MOBILIZE_MAPPING_VERSION,
      localFingerprint: "local-a",
      payloadFingerprint: "payload-a",
      targetOrganizationId: "42",
      approvedByUserId: "u1",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      state: "ACTIVE" as const,
    };
    expect(
      validatePublicationApproval({
        approval: base,
        currentLocalFingerprint: "local-a",
        currentPayloadFingerprint: "payload-a",
        currentMappingVersion: MOBILIZE_MAPPING_VERSION,
        currentOrganizationId: "42",
      }).ok,
    ).toBe(true);
    expect(
      validatePublicationApproval({
        approval: base,
        currentLocalFingerprint: "local-b",
        currentPayloadFingerprint: "payload-a",
        currentMappingVersion: MOBILIZE_MAPPING_VERSION,
        currentOrganizationId: "42",
      }),
    ).toMatchObject({ ok: false, code: "LOCAL_FINGERPRINT_STALE" });
    expect(
      validatePublicationApproval({
        approval: { ...base, state: "CONSUMED" },
        currentLocalFingerprint: "local-a",
        currentPayloadFingerprint: "payload-a",
        currentMappingVersion: MOBILIZE_MAPPING_VERSION,
        currentOrganizationId: "42",
      }),
    ).toMatchObject({ ok: false, code: "APPROVAL_NOT_ACTIVE" });
    expect(
      validatePublicationApproval({
        approval: base,
        currentLocalFingerprint: "local-a",
        currentPayloadFingerprint: "payload-a",
        currentMappingVersion: MOBILIZE_MAPPING_VERSION,
        currentOrganizationId: "99",
      }),
    ).toMatchObject({ ok: false, code: "ORG_CHANGED" });
  });

  it("classifies create outcomes and never fabricates remote ids", () => {
    expect(classifyCreateOutcome({ remoteObjectId: "99" }).kind).toBe("SUCCESS");
    expect(
      classifyCreateOutcome({ errorCategory: "TIMEOUT" }).kind,
    ).toBe("UNKNOWN_REMOTE_OUTCOME");
    expect(
      classifyCreateOutcome({ malformedSuccess: true }).kind,
    ).toBe("FAILED");
    expect(
      buildCreateIdempotencyKey({
        eventId: "e1",
        payloadFingerprint: "p",
        organizationId: "1",
        mappingVersion: "m",
      }),
    ).toContain("mobilize-create:");
  });

  it("three-way comparison never uses last-write-wins", () => {
    expect(
      classifyThreeWayField({
        field: "title",
        base: "A",
        local: "B",
        remote: "A",
      }).classification,
    ).toBe("LOCAL_ONLY");
    expect(
      classifyThreeWayField({
        field: "title",
        base: "A",
        local: "A",
        remote: "C",
      }).classification,
    ).toBe("REMOTE_ONLY");
    expect(
      classifyThreeWayField({
        field: "title",
        base: "A",
        local: "B",
        remote: "B",
      }).classification,
    ).toBe("SAME_CHANGE");
    expect(
      classifyThreeWayField({
        field: "title",
        base: "A",
        local: "B",
        remote: "C",
      }).classification,
    ).toBe("CONFLICT");

    const compared = compareThreeWayDocuments({
      base: { title: "A", visibility: "PUBLIC" },
      local: { title: "B", visibility: "PUBLIC" },
      remote: { title: "C", visibility: "PRIVATE" },
      fields: ["title", "visibility"],
    });
    expect(compared.hasConflict).toBe(true);
    expect(compared.conflicts).toContain("title");
  });

  it("reconciles timeslots by remote id and protects remote-only slots", () => {
    const result = reconcileTimeslots({
      local: [
        { localKey: "a", start: 100, end: 200, remoteId: "1" },
        { localKey: "b", start: 300, end: 400 },
      ],
      remote: [
        { id: "1", start: 100, end: 200 },
        { id: "9", start: 500, end: 600 },
      ],
    });
    expect(result.wouldDeleteRemoteOnlyIfOmitted).toEqual(["9"]);
    expect(result.rows.some((r) => r.classification === "REMOTE_ONLY")).toBe(true);
    expect(result.rows.some((r) => r.classification === "NEW_LOCAL")).toBe(true);
    expect(result.collectionReplacementWarning).toMatch(/PUT replaces/);
  });

  it("mocked create stores remote id; malformed success fails; create is not retried by adapter", async () => {
    let posts = 0;
    const adapter = new MobilizeAdapter({
      apiKey: "test-key",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "42",
      transport: async (req) => {
        if (req.method === "POST") {
          posts += 1;
          return {
            status: 200,
            headers: {},
            bodyText: JSON.stringify({
              data: {
                id: 77,
                title: "Join our canvass",
                modified_date: 1700000000,
                timeslots: [{ id: 5, start_date: 100, end_date: 200 }],
              },
            }),
          };
        }
        return { status: 404, headers: {}, bodyText: "{}" };
      },
    });
    const created = await adapter.createOrganizationEvent({
      title: "Join our canvass",
      description: "x",
      timeslots: [{ start_date: 100, end_date: 200 }],
      timezone: "America/Chicago",
      event_type: "CANVASS",
      visibility: "PUBLIC",
      contact: { email_address: "ops@example.com" },
    });
    expect(created.id).toBe("77");
    expect(posts).toBe(1);

    const bad = new MobilizeAdapter({
      apiKey: "test-key",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "42",
      transport: async () => ({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({ data: { title: "no id" } }),
      }),
    });
    await expect(bad.createOrganizationEvent({ title: "x" })).rejects.toMatchObject({
      category: "PARSE",
    });
  });

  it("config defaults keep publishing/update/delete off without inventing credentials", () => {
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
    expect(status.outboundWritesEnabled).toBe(false);
    expect(status.networkPublishingAvailable).toBe(false);
    expect(status.deleteEnabled).toBe(false);
  });

  it("lifecycle isolation: publish does not mutate Mission surfaces", () => {
    const iso = assertMobilizePublishingIsolation();
    expect(iso.autoCreatesMissionOnPublish).toBe(false);
    expect(iso.autoPublishesOnMissionCreate).toBe(false);
    expect(iso.mutatesExecute).toBe(false);
    expect(iso.mutatesFieldOps).toBe(false);
    expect(iso.mutatesIncidents).toBe(false);
    expect(iso.mutatesExceptionDigest).toBe(false);
    expect(iso.mutatesPeople).toBe(false);
    expect(iso.mutatesAttendance).toBe(false);
    expect(iso.silentConflictOverwrite).toBe(false);
    expect(iso.remoteDeleteOnLocalCancel).toBe(false);
    expect(iso.localDeleteOnRemoteDelete).toBe(false);
  });
});
