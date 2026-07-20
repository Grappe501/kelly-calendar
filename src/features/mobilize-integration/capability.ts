import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import type { MobilizeAdapter } from "@/features/mobilize-integration/adapter";
import { MobilizeTransportError } from "@/features/mobilize-integration/transport";
import type {
  CapabilityTier,
  MobilizeCapabilityReport,
  MobilizeConnectionState,
} from "@/features/mobilize-integration/types";

const documentedOn = (enabled = false): CapabilityTier => ({
  documented: true,
  credentialTested: false,
  applicationEnabled: enabled,
});

const documentedOff = (): CapabilityTier => ({
  documented: true,
  credentialTested: false,
  applicationEnabled: false,
});

export function buildBaseCapabilityReport(
  state: MobilizeConnectionState,
  flags?: {
    publishingEnabled?: boolean;
    updatesEnabled?: boolean;
    deleteEnabled?: boolean;
  },
): MobilizeCapabilityReport {
  const publishing = flags?.publishingEnabled === true;
  const updates = flags?.updatesEnabled === true;
  const deletes = flags?.deleteEnabled === true;
  return {
    connectionState: state,
    organization: { id: null, name: null, slug: null },
    lastVerifiedAt: null,
    rateLimitObserved: false,
    capabilities: {
      readOrganizations: documentedOn(false),
      readOrganizationEvents: documentedOn(false),
      readPrivateEventFields: documentedOn(false),
      readDeletedEvents: documentedOn(false),
      readPeople: documentedOn(false),
      readAttendances: documentedOn(false),
      readEventAttendances: documentedOn(false),
      readEnums: documentedOn(false),
      createEvents: documentedOn(publishing),
      updateEvents: documentedOn(updates),
      deleteEvents: documentedOn(deletes),
      createAttendances: documentedOff(),
      uploadImages: documentedOff(),
      createAffiliations: documentedOff(),
    },
    outboundWritesForcedDisabled: !(publishing || updates),
    personLevelApplyEnabled: false,
    attendanceApplyEnabled: false,
    affiliationWritesEnabled: false,
    imageUploadsEnabled: false,
    documentationRevision: MOBILIZE_DOCS.documentationRevisionShort,
    adapterVersion: MOBILIZE_DOCS.adapterVersion,
    mappingVersion: MOBILIZE_DOCS.mappingVersion,
  };
}

function markTested(
  tier: CapabilityTier,
  ok: boolean,
  applicationEnabled = false,
): CapabilityTier {
  return {
    documented: true,
    credentialTested: ok,
    applicationEnabled: applicationEnabled && ok,
  };
}

/**
 * Credential-test read capabilities with safe probes.
 * Never performs write/delete probes.
 */
export async function discoverMobilizeCapabilities(input: {
  adapter: MobilizeAdapter;
  importEventsEnabled: boolean;
  expectedOrganizationId: string;
  publishingEnabled?: boolean;
  updatesEnabled?: boolean;
  deleteEnabled?: boolean;
}): Promise<MobilizeCapabilityReport> {
  const report = buildBaseCapabilityReport("CONFIGURED_UNVERIFIED", {
    publishingEnabled: input.publishingEnabled,
    updatesEnabled: input.updatesEnabled,
    deleteEnabled: input.deleteEnabled,
  });
  report.organization.id = input.expectedOrganizationId;

  try {
    // Safe probe: list org events (authenticated org scope). Never probe writes.
    const eventsPage = await input.adapter.listOrganizationEvents({ perPage: 1 });
    report.capabilities.readOrganizationEvents = markTested(
      report.capabilities.readOrganizationEvents,
      true,
      input.importEventsEnabled,
    );
    report.capabilities.readOrganizations = markTested(
      report.capabilities.readOrganizations,
      true,
      false,
    );

    try {
      await input.adapter.listDeletedOrganizationEvents();
      report.capabilities.readDeletedEvents = markTested(
        report.capabilities.readDeletedEvents,
        true,
        input.importEventsEnabled,
      );
    } catch {
      report.capabilities.readDeletedEvents = markTested(
        report.capabilities.readDeletedEvents,
        false,
      );
    }

    try {
      await input.adapter.listPeople();
      report.capabilities.readPeople = markTested(
        report.capabilities.readPeople,
        true,
        false,
      );
    } catch (err) {
      if (err instanceof MobilizeTransportError && err.status === 403) {
        report.capabilities.readPeople = {
          documented: true,
          credentialTested: false,
          applicationEnabled: false,
        };
      }
    }

    try {
      await input.adapter.listAttendances();
      report.capabilities.readAttendances = markTested(
        report.capabilities.readAttendances,
        true,
        false,
      );
      report.capabilities.readEventAttendances = markTested(
        report.capabilities.readEventAttendances,
        true,
        false,
      );
    } catch {
      // leave untested
    }

    try {
      await input.adapter.getEnums();
      report.capabilities.readEnums = markTested(
        report.capabilities.readEnums,
        true,
        false,
      );
    } catch {
      // leave untested
    }

    // Create/update/delete remain credential-tested:false until a real write succeeds
    // under operator-enabled flags — never probe write endpoints to discover permission.
    report.capabilities.createEvents = {
      documented: true,
      credentialTested: false,
      applicationEnabled: Boolean(input.publishingEnabled),
    };
    report.capabilities.updateEvents = {
      documented: true,
      credentialTested: false,
      applicationEnabled: Boolean(input.updatesEnabled),
    };
    report.capabilities.deleteEvents = {
      documented: true,
      credentialTested: false,
      applicationEnabled: Boolean(input.deleteEnabled),
    };

    void eventsPage;
    report.connectionState = input.adapter.rateLimitObserved
      ? "DEGRADED"
      : "CONNECTED";
    report.rateLimitObserved = input.adapter.rateLimitObserved;
    report.lastVerifiedAt = new Date().toISOString();
    return report;
  } catch (err) {
    if (err instanceof MobilizeTransportError) {
      if (err.category === "INVALID_CREDENTIALS") {
        report.connectionState = "INVALID_CREDENTIALS";
      } else if (err.category === "RATE_LIMITED") {
        report.connectionState = "RATE_LIMITED";
        report.rateLimitObserved = true;
      } else if (err.category === "UNAVAILABLE" || err.category === "NETWORK") {
        report.connectionState = "UNAVAILABLE";
      } else {
        report.connectionState = "INSUFFICIENT_ACCESS";
      }
      return report;
    }
    report.connectionState = "UNAVAILABLE";
    return report;
  }
}
