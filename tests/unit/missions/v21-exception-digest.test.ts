import { describe, expect, it } from "vitest";
import type { IncidentMissionContext } from "@/lib/missions/v21/incident-log";
import type { MissionIncidentPersisted } from "@/lib/missions/v21/incident-log";
import {
  assertDigestDoesNotMutateOperationalSystems,
  assertNoMobilizeNetworkDuringDigest,
  buildDayExceptionDigestView,
  buildExceptionDigestLaunchBlockers,
  computeDigestSourceFingerprint,
  deriveExceptionDigestEntries,
  filterIncidentsForDigestViewer,
  getMobilizeAdapterBoundary,
  isDigestFingerprintStale,
  MOBILIZE_CAPABILITY_MAP,
  nextDigestReviewStatusAfterMaterialChange,
  selectTomorrowPreviewEntries,
  validateDigestReviewComplete,
} from "@/lib/missions/v21/exception-digest";
import { incidentDispositionClearsForReadiness } from "@/lib/missions/v21/incident-log/labels";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z");
const DATE = "2026-07-20";

function context(
  overrides: Partial<IncidentMissionContext> & { missionId: string },
): IncidentMissionContext {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T16:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T18:00:00.000Z",
    timezone: TZ,
    campaignDateKey: overrides.campaignDateKey ?? DATE,
    lifecyclePhase: overrides.lifecyclePhase ?? "EXECUTE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    executionStatus: overrides.executionStatus ?? "IN_PROGRESS",
    isCancelled: overrides.isCancelled ?? false,
    closeoutReviewedAt: overrides.closeoutReviewedAt ?? null,
  };
}

function incident(
  overrides: Partial<MissionIncidentPersisted> & {
    id: string;
    missionId: string;
  },
): MissionIncidentPersisted {
  return {
    id: overrides.id,
    missionId: overrides.missionId,
    campaignDateKey: overrides.campaignDateKey ?? DATE,
    incidentRef: overrides.incidentRef ?? `INC-${overrides.id}`,
    category: overrides.category ?? "SAFETY",
    severity: overrides.severity ?? "HIGH",
    status: overrides.status ?? "OPEN",
    summary: overrides.summary ?? "Access delayed",
    description: overrides.description ?? "Details",
    observedAt: overrides.observedAt ?? NOW.toISOString(),
    reportedAt: overrides.reportedAt ?? NOW.toISOString(),
    reportedByUserId: "u1",
    locationLabel: "Main",
    sensitivity: overrides.sensitivity ?? "STANDARD",
    immediateActionSummary: null,
    ownerName: overrides.ownerName ?? "Ops",
    ownerUserId: null,
    carryForwardRequired: overrides.carryForwardRequired ?? false,
    carriedForwardAt: overrides.carriedForwardAt ?? null,
    carriedForwardByUserId: null,
    followUpRequired: overrides.followUpRequired ?? false,
    linkedFollowUpActionId: overrides.linkedFollowUpActionId ?? null,
    linkedFollowUpImportKey: null,
    stabilizedAt: overrides.stabilizedAt ?? null,
    stabilizedByUserId: null,
    resolvedAt: overrides.resolvedAt ?? null,
    resolvedByUserId: null,
    closedAt: null,
    closedByUserId: null,
    archivedAt: null,
    archivedByUserId: null,
    isArchived: overrides.isArchived ?? false,
    createdByUserId: "u1",
    updatedByUserId: "u1",
    createdAt: NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
    updates: overrides.updates ?? [],
    acknowledgements: overrides.acknowledgements ?? [],
  };
}

describe("V2.1 Campaign Day Exception Digest", () => {
  it("derives open high/critical separately from lower severity", () => {
    const high = incident({ id: "i1", missionId: "m1", severity: "CRITICAL" });
    const low = incident({
      id: "i2",
      missionId: "m1",
      severity: "LOW",
      status: "OPEN",
    });
    const contexts = new Map([["m1", context({ missionId: "m1" })]]);
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [high, low],
      contextsByMissionId: contexts,
      digestReviewedAt: null,
      now: NOW,
    });
    expect(entries.find((e) => e.incidentId === "i1")?.buckets).toContain(
      "OPEN_HIGH_CRITICAL",
    );
    expect(entries.find((e) => e.incidentId === "i2")?.buckets).toContain(
      "OPEN_LOWER_SEVERITY",
    );
  });

  it("includes monitoring/stabilized, carry-forward, and follow-up gaps", () => {
    const monitoring = incident({
      id: "i3",
      missionId: "m1",
      status: "MONITORING",
      severity: "MODERATE",
    });
    const carry = incident({
      id: "i4",
      missionId: "m1",
      carryForwardRequired: true,
      carriedForwardAt: NOW.toISOString(),
    });
    const gap = incident({
      id: "i5",
      missionId: "m1",
      severity: "MODERATE",
      followUpRequired: true,
      linkedFollowUpActionId: null,
    });
    const contexts = new Map([["m1", context({ missionId: "m1" })]]);
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [monitoring, carry, gap],
      contextsByMissionId: contexts,
      digestReviewedAt: null,
      now: NOW,
    });
    expect(entries.find((e) => e.incidentId === "i3")?.buckets).toContain(
      "MONITORING_STABILIZED",
    );
    expect(entries.find((e) => e.incidentId === "i4")?.buckets).toContain(
      "EXPLICIT_CARRY_FORWARD",
    );
    expect(entries.find((e) => e.incidentId === "i5")?.buckets).toContain(
      "FOLLOW_UP_GAP",
    );
  });

  it("flags post-closeout updates and overnight / cancelled missions", () => {
    const closeoutAt = "2026-07-20T12:00:00.000Z";
    const post = incident({
      id: "i6",
      missionId: "m1",
      updatedAt: "2026-07-20T13:00:00.000Z",
    });
    const overnight = incident({
      id: "i7",
      missionId: "m2",
      campaignDateKey: "2026-07-19",
      status: "OPEN",
      severity: "HIGH",
    });
    const cancelled = incident({
      id: "i8",
      missionId: "m3",
      status: "OPEN",
      severity: "MODERATE",
    });
    const contexts = new Map([
      [
        "m1",
        context({ missionId: "m1", closeoutReviewedAt: closeoutAt }),
      ],
      [
        "m2",
        context({
          missionId: "m2",
          campaignDateKey: "2026-07-19",
          startsAt: "2026-07-19T22:00:00.000Z",
          endsAt: "2026-07-20T02:00:00.000Z",
        }),
      ],
      ["m3", context({ missionId: "m3", isCancelled: true })],
    ]);
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [post, overnight, cancelled],
      contextsByMissionId: contexts,
      digestReviewedAt: null,
      now: NOW,
    });
    expect(entries.find((e) => e.incidentId === "i6")?.buckets).toContain(
      "UPDATED_AFTER_CLOSEOUT",
    );
    expect(entries.find((e) => e.incidentId === "i7")?.buckets).toContain(
      "OVERNIGHT",
    );
    expect(entries.find((e) => e.incidentId === "i7")?.buckets).toContain(
      "ORIGINATED_EARLIER",
    );
    expect(entries.find((e) => e.incidentId === "i8")?.buckets).toContain(
      "CANCELLED_MISSION",
    );
  });

  it("includes resolved-during-day context and stable ordering by severity", () => {
    const resolved = incident({
      id: "i9",
      missionId: "m1",
      status: "RESOLVED",
      severity: "LOW",
      resolvedAt: "2026-07-20T15:00:00.000Z",
    });
    const critical = incident({
      id: "i10",
      missionId: "m1",
      severity: "CRITICAL",
    });
    const contexts = new Map([["m1", context({ missionId: "m1" })]]);
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [resolved, critical],
      contextsByMissionId: contexts,
      digestReviewedAt: null,
      now: NOW,
    });
    expect(entries[0]?.incidentId).toBe("i10");
    expect(entries.find((e) => e.incidentId === "i9")?.buckets).toContain(
      "RESOLVED_DURING_DAY",
    );
    expect(entries.every((e) => e.incidentRef && e.missionId)).toBe(true);
  });

  it("distinguishes first Mission from primary Mission in digest view", () => {
    const early = context({
      missionId: "m-early",
      title: "First",
      startsAt: "2026-07-20T14:00:00.000Z",
      endsAt: "2026-07-20T15:00:00.000Z",
      lifecyclePhase: "PREPARE",
    });
    const primary = context({
      missionId: "m-primary",
      title: "Primary",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T20:00:00.000Z",
      lifecyclePhase: "EXECUTE",
    });
    const view = buildDayExceptionDigestView({
      campaignDate: DATE,
      now: NOW,
      campaignTimezone: TZ,
      missions: [early, primary],
      incidents: [],
      visibleIncidents: [],
      confidentialOmitted: false,
      review: null,
    });
    expect(view.firstMissionTitle).toBe("First");
    expect(view.primaryMissionTitle).toBe("Primary");
    expect(view.entries).toEqual([]);
    expect(view.isolation.mutatesIncidents).toBe(false);
    expect(view.isolation.createsMobilizeRecords).toBe(false);
  });

  it("keeps confidential incidents out of restricted viewer counts", () => {
    const open = incident({ id: "a", missionId: "m1" });
    const secret = incident({
      id: "b",
      missionId: "m1",
      sensitivity: "CONFIDENTIAL",
      summary: "SECRET TEXT",
    });
    const { visible, confidentialOmitted } = filterIncidentsForDigestViewer(
      [open, secret],
      "VOLUNTEER" as never,
    );
    expect(confidentialOmitted).toBe(true);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe("a");
  });

  it("fingerprints material changes and ignores cosmetic narrative-only presence drift carefully", () => {
    const base = incident({ id: "f1", missionId: "m1", summary: "A" });
    const fp1 = computeDigestSourceFingerprint([base]);
    const severityChanged = incident({
      id: "f1",
      missionId: "m1",
      summary: "A",
      severity: "CRITICAL",
    });
    expect(isDigestFingerprintStale(fp1, computeDigestSourceFingerprint([severityChanged]))).toBe(
      true,
    );
    const sameFacts = incident({ id: "f1", missionId: "m1", summary: "B" });
    // Summary content changes but presence bit stays — fingerprint stays stable for narrative text.
    expect(computeDigestSourceFingerprint([sameFacts])).toBe(fp1);
  });

  it("marks REVIEWED → STALE on material change without inventing review rows", () => {
    expect(nextDigestReviewStatusAfterMaterialChange("REVIEWED")).toBe("STALE");
    expect(nextDigestReviewStatusAfterMaterialChange(null)).toBeNull();
    const validated = validateDigestReviewComplete({ note: "ok" });
    expect(validated.ok).toBe(true);
  });

  it("ACKNOWLEDGED does not clear blockers; accepted risk retains disposition semantics", () => {
    expect(incidentDispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(incidentDispositionClearsForReadiness("ACCEPTED_RISK")).toBe(true);
    const entryIncident = incident({
      id: "ack1",
      missionId: "m1",
      acknowledgements: [
        {
          id: "a1",
          issueKey: "OPEN_HIGH_CRITICAL:ack1",
          issueType: "OPEN_HIGH_CRITICAL",
          title: "Open high",
          disposition: "ACKNOWLEDGED",
          note: null,
          acceptedRiskReason: null,
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [entryIncident],
      contextsByMissionId: new Map([["m1", context({ missionId: "m1" })]]),
      digestReviewedAt: null,
      now: NOW,
    });
    expect(entries[0]?.acknowledgedUnclearedBlocker).toBe(true);
    expect(entries[0]?.buckets).toContain("ACKNOWLEDGED_BLOCKER");
  });

  it("tomorrow preview only includes policy-qualified carry-forward", () => {
    const carried = incident({
      id: "t1",
      missionId: "m1",
      carryForwardRequired: true,
      carriedForwardAt: NOW.toISOString(),
    });
    const notCarried = incident({
      id: "t2",
      missionId: "m1",
      severity: "LOW",
      status: "OPEN",
    });
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [carried, notCarried],
      contextsByMissionId: new Map([["m1", context({ missionId: "m1" })]]),
      digestReviewedAt: null,
      now: NOW,
    });
    const preview = selectTomorrowPreviewEntries(entries);
    expect(preview.every((e) => e.carryForwardRequired || e.carriedForwardAt)).toBe(
      true,
    );
    expect(preview.some((e) => e.incidentId === "t2")).toBe(false);
  });

  it("proves lifecycle isolation and Mobilize readiness without network", () => {
    const isolation = assertDigestDoesNotMutateOperationalSystems();
    expect(isolation.mutatesIncidents).toBe(false);
    expect(isolation.mutatesCloseout).toBe(false);
    expect(isolation.mutatesLaunch).toBe(false);
    expect(isolation.createsMobilizeRecords).toBe(false);
    expect(isolation.performsRemoteSync).toBe(false);
    assertNoMobilizeNetworkDuringDigest();
    const boundary = getMobilizeAdapterBoundary();
    expect(boundary.systemOfRecord).toBe("LOCAL");
    expect(boundary.secretsInBrowser).toBe(false);
    expect(boundary.speculativeNetworkCalls).toBe(false);
    expect(MOBILIZE_CAPABILITY_MAP.EVENT_PUBLISH.enabled).toBe(false);
    expect(MOBILIZE_CAPABILITY_MAP.EVENT_PUBLISH.requiresOfficialDocs).toBe(
      true,
    );
  });

  it("maps digest entries into launch blockers without mutating incidents", () => {
    const entries = deriveExceptionDigestEntries({
      selectedDateKey: DATE,
      incidents: [incident({ id: "lb1", missionId: "m1", severity: "CRITICAL" })],
      contextsByMissionId: new Map([["m1", context({ missionId: "m1" })]]),
      digestReviewedAt: null,
      now: NOW,
    });
    const blockers = buildExceptionDigestLaunchBlockers({
      entries,
      acknowledgements: [],
    });
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers[0]?.acknowledgementImportKey).toMatch(/^INCIDENT_DIGEST:/);
  });

  it("builds empty digest without fabricating review or sync records", () => {
    const view = buildDayExceptionDigestView({
      campaignDate: DATE,
      now: NOW,
      campaignTimezone: TZ,
      missions: [context({ missionId: "m1" })],
      incidents: [],
      visibleIncidents: [],
      confidentialOmitted: false,
      review: null,
    });
    expect(view.review.exists).toBe(false);
    expect(view.review.status).toBe("NONE");
    expect(view.counts.visibleIncidentCount).toBe(0);
    expect(view.navigation.reportHref).toContain("/exceptions/report");
    expect(view.emergencyNotice).toMatch(/does not summon assistance/i);
  });
});
