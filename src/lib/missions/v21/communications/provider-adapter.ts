/**
 * Provider-neutral communication adapter boundary (D20).
 * Documented + credential-tested + application-enabled are separate gates.
 * D20 keeps all send methods disabled.
 */

export type CommunicationProviderCapability =
  | "EMAIL_SEND"
  | "SMS_SEND"
  | "IN_APP_DELIVER"
  | "MANUAL_EXPORT"
  | "MANUAL_HANDOFF"
  | "STATUS_WEBHOOK"
  | "SUPPRESSION_IMPORT"
  | "BOUNCE_IMPORT";

export type ProviderCapabilityStatus = {
  capability: CommunicationProviderCapability;
  documented: boolean;
  credentialTested: boolean;
  applicationEnabled: boolean;
};

export type DispatchRequest = {
  queueItemId: string;
  channel: string;
  destinationRef: string;
  contentFingerprint: string;
  idempotencyKey: string;
};

export type DispatchResult =
  | {
      ok: true;
      externalDispatchId: string;
      acceptedAt: string;
    }
  | {
      ok: false;
      reason: string;
      code: "DISABLED" | "NOT_CONFIGURED" | "REJECTED" | "ERROR";
    };

export interface CampaignCommunicationProviderAdapter {
  id: string;
  listCapabilities(): ProviderCapabilityStatus[];
  dispatch(request: DispatchRequest): Promise<DispatchResult>;
}

/** Default D20 adapter — no external sends. */
export class DisabledCommunicationProviderAdapter
  implements CampaignCommunicationProviderAdapter
{
  id = "disabled-d20";

  listCapabilities(): ProviderCapabilityStatus[] {
    return [
      {
        capability: "EMAIL_SEND",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
      {
        capability: "SMS_SEND",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
      {
        capability: "IN_APP_DELIVER",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
      {
        capability: "MANUAL_EXPORT",
        documented: true,
        credentialTested: true,
        applicationEnabled: true,
      },
      {
        capability: "MANUAL_HANDOFF",
        documented: true,
        credentialTested: true,
        applicationEnabled: true,
      },
      {
        capability: "STATUS_WEBHOOK",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
      {
        capability: "SUPPRESSION_IMPORT",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
      {
        capability: "BOUNCE_IMPORT",
        documented: true,
        credentialTested: false,
        applicationEnabled: false,
      },
    ];
  }

  async dispatch(_request: DispatchRequest): Promise<DispatchResult> {
    return {
      ok: false,
      reason:
        "External provider dispatch is disabled in Deliverable 20. Use export or manual handoff only.",
      code: "DISABLED",
    };
  }
}

export function getDefaultCommunicationProviderAdapter() {
  return new DisabledCommunicationProviderAdapter();
}
