import { describe, expect, it } from "vitest";
import { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import {
  assertMobilizeAttendanceIsolation,
  buildAttendanceAggregates,
  categorizeAttendance,
  proposePersonMatch,
} from "@/features/mobilize-integration/attendance";
import {
  MOBILIZE_DOCS,
  normalizeAttendance,
  mobilizeConfigStatus,
} from "@/features/mobilize-integration";

describe("V2.1 Mobilize Signup/Attendance Read (D18)", () => {
  it("records D18 attendance documentation surface", () => {
    expect(MOBILIZE_DOCS.documentationRevisionShort).toBe("1025d0f");
    expect(MOBILIZE_DOCS.d18InspectionDate).toBe("2026-07-20");
    expect(MOBILIZE_DOCS.attendanceEndpoints.listEventAttendances).toMatch(
      /attendances/,
    );
    expect(MOBILIZE_DOCS.attendanceStatusesDocumented).toEqual([
      "REGISTERED",
      "CANCELLED",
      "CONFIRMED",
    ]);
    expect(MOBILIZE_DOCS.personLevelApplyDefault).toBe(false);
    expect(MOBILIZE_DOCS.personConsentAuthorityPresent).toBe(false);
    expect(MOBILIZE_DOCS.attendanceFieldsDeniedByDefault).toContain(
      "custom_signup_field_values",
    );
  });

  it("normalizes attendance without leaking contact or custom field values", () => {
    const row = normalizeAttendance({
      id: 11,
      status: "REGISTERED",
      attended: null,
      created_date: 1700000000,
      modified_date: 1700001000,
      event: { id: 5 },
      timeslot: { id: 9 },
      person: {
        id: 3,
        email_addresses: [{ address: "secret@example.com" }],
        given_name: "Pat",
      },
      referrer: { utm_source: "x" },
      custom_signup_field_values: [
        { custom_field_id: 1, text_value: "wheelchair ramp needed" },
      ],
    });
    expect(row?.id).toBe("11");
    expect(row?.timeslotId).toBe("9");
    expect(row?.isSignup).toBe(true);
    expect(row?.isCancelled).toBe(false);
    expect(row?.attended).toBeNull();
    expect(row?.customSignupFieldCount).toBe(1);
    expect(row?.hasReferrer).toBe(true);
    expect(JSON.stringify(row)).not.toMatch(/secret@example.com/);
    expect(JSON.stringify(row)).not.toMatch(/wheelchair/);
    expect(JSON.stringify(row)).not.toMatch(/Pat/);
  });

  it("separates signup, cancellation, attended, and unknown statuses in aggregates", () => {
    const rows = [
      normalizeAttendance({
        id: 1,
        status: "REGISTERED",
        attended: null,
        event: { id: 1 },
        timeslot: { id: 10 },
      })!,
      normalizeAttendance({
        id: 2,
        status: "CONFIRMED",
        attended: null,
        event: { id: 1 },
        timeslot: { id: 10 },
      })!,
      normalizeAttendance({
        id: 3,
        status: "CANCELLED",
        attended: null,
        event: { id: 1 },
        timeslot: { id: 10 },
      })!,
      normalizeAttendance({
        id: 4,
        status: "CONFIRMED",
        attended: true,
        event: { id: 1 },
        timeslot: { id: 11 },
      })!,
      normalizeAttendance({
        id: 5,
        status: "BRAND_NEW_STATUS",
        attended: null,
        event: { id: 1 },
        timeslot: { id: 11 },
      })!,
    ];
    expect(categorizeAttendance(rows[0]!)).toBe("SIGNUP_REGISTERED");
    expect(categorizeAttendance(rows[2]!)).toBe("CANCELLED");
    expect(categorizeAttendance(rows[3]!)).toBe("ATTENDED");
    expect(categorizeAttendance(rows[4]!)).toBe("UNKNOWN_STATUS");

    const report = buildAttendanceAggregates({
      rows,
      localEventByExternalEventId: new Map([["1", "evt_local"]]),
      localMissionByLocalEventId: new Map([["evt_local", "msn_1"]]),
      knownRemoteTimeslotIds: new Set(["10", "11", "99"]),
    });
    expect(report.containsPii).toBe(false);
    expect(report.totals.signupsRegistered).toBe(1);
    expect(report.totals.signupsConfirmed).toBe(1);
    expect(report.totals.cancellations).toBe(1);
    expect(report.totals.attended).toBe(1);
    expect(report.totals.unknownStatus).toBe(1);
    expect(report.unmatchedTimeslotIds).toEqual(["99"]);
    expect(report.unknownStatuses).toContain("BRAND_NEW_STATUS");
    expect(report.byEventTimeslot).toHaveLength(2);
    expect(report.byEventTimeslot[0]?.localMissionId).toBe("msn_1");
    // Never a single collapsed "attendee" field
    expect(
      (report.totals as Record<string, unknown>).attendees,
    ).toBeUndefined();
  });

  it("keeps name-only and shared identifiers ambiguous; never auto-creates people", () => {
    expect(
      proposePersonMatch({
        externalPersonId: "p1",
        evidence: { nameOnlyLocalPersonIds: ["a", "b"] },
      }).status,
    ).toBe("AMBIGUOUS");
    expect(
      proposePersonMatch({
        externalPersonId: "p1",
        evidence: { exactEmailLocalPersonIds: ["a", "b"] },
      }).status,
    ).toBe("AMBIGUOUS");
    expect(
      proposePersonMatch({
        externalPersonId: "p1",
        evidence: {
          exactEmailLocalPersonIds: ["a"],
          exactPhoneLocalPersonIds: ["b"],
        },
      }).conflictReason,
    ).toMatch(/different/i);
    const ok = proposePersonMatch({
      externalPersonId: "p1",
      evidence: {
        existingExternalRefLocalPersonId: "local-1",
      },
    });
    expect(ok.status).toBe("PROPOSED");
    expect(ok.matchMethod).toBe("EXISTING_EXTERNAL_REF");
    expect(
      proposePersonMatch({
        externalPersonId: "p1",
        evidence: {},
        doNotLink: true,
      }).status,
    ).toBe("DO_NOT_LINK");
  });

  it("paginates event attendances via mocked transport without raw PII in normalized rows", async () => {
    let calls = 0;
    const adapter = new MobilizeAdapter({
      apiKey: "test-key",
      apiBaseUrl: "https://api.mobilize.us/v1",
      organizationId: "42",
      transport: async (req) => {
        calls += 1;
        if (calls === 1) {
          return {
            status: 200,
            headers: {},
            bodyText: JSON.stringify({
              data: [
                {
                  id: 1,
                  status: "REGISTERED",
                  attended: null,
                  event: { id: 7 },
                  timeslot: { id: 1 },
                  person: { id: 9, email_addresses: [{ address: "a@x.com" }] },
                },
              ],
              next: "https://api.mobilize.us/v1/organizations/42/events/7/attendances?cursor=2",
              previous: null,
            }),
          };
        }
        expect(req.url).toContain("cursor=2");
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            data: [
              {
                id: 2,
                status: "CANCELLED",
                attended: false,
                event: { id: 7 },
                timeslot: { id: 1 },
              },
            ],
            next: null,
            previous: null,
            results_limited_to: 1000,
          }),
        };
      },
    });
    const page1 = await adapter.listEventAttendances("7");
    expect(page1.data[0]?.isSignup).toBe(true);
    expect(JSON.stringify(page1.data)).not.toMatch(/a@x.com/);
    const page2 = await adapter.listEventAttendances("7", {
      nextUrl: page1.next,
    });
    expect(page2.data[0]?.isCancelled).toBe(true);
    expect(page2.resultsLimitedTo).toBe(1000);
  });

  it("preserves cancellation vs reactivation categories without deleting history semantics", () => {
    const cancelled = normalizeAttendance({
      id: 8,
      status: "CANCELLED",
      attended: null,
      event: { id: 1 },
      timeslot: { id: 1 },
      modified_date: 1700000000,
    })!;
    const reactivated = normalizeAttendance({
      id: 8,
      status: "REGISTERED",
      attended: null,
      event: { id: 1 },
      timeslot: { id: 1 },
      modified_date: 1700005000,
    })!;
    expect(categorizeAttendance(cancelled)).toBe("CANCELLED");
    expect(categorizeAttendance(reactivated)).toBe("SIGNUP_REGISTERED");
  });

  it("does not infer no-show solely from attended null", () => {
    const row = normalizeAttendance({
      id: 1,
      status: "CONFIRMED",
      attended: null,
      event: { id: 1 },
      timeslot: { id: 1 },
    })!;
    expect(categorizeAttendance(row)).toBe("SIGNUP_CONFIRMED");
    expect(categorizeAttendance(row)).not.toBe("NOT_ATTENDED");
  });

  it("config defaults keep attendance import and person apply off", () => {
    const status = mobilizeConfigStatus({
      apiKey: null,
      organizationId: null,
      apiBaseUrl: MOBILIZE_DOCS.apiBaseUrl,
      importEventsEnabled: false,
      importAttendanceEnabled: false,
      publishingEnabled: false,
      updatesEnabled: false,
      deleteEnabled: false,
      defaultContactEmail: null,
      campaignScopeKey: "KELLY",
    });
    expect(status.importAttendanceEnabled).toBe(false);
    expect(status.fullyConfigured).toBe(false);
  });

  it("lifecycle isolation: attendance read does not mutate ops or write Mobilize", () => {
    const iso = assertMobilizeAttendanceIsolation();
    expect(iso.treatsSignupAsAttendance).toBe(false);
    expect(iso.treatsAttendanceAsCheckIn).toBe(false);
    expect(iso.treatsAttendanceAsExecute).toBe(false);
    expect(iso.infersCommunicationConsent).toBe(false);
    expect(iso.autoCreatesLocalPerson).toBe(false);
    expect(iso.personLevelApplyEnabled).toBe(false);
    expect(iso.writesMobilizeAttendance).toBe(false);
    expect(iso.mutatesFieldOps).toBe(false);
    expect(iso.mutatesExecute).toBe(false);
    expect(iso.mutatesMission).toBe(false);
  });
});
