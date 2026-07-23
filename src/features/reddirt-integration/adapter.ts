import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";
import {
  createRedDirtFetchTransport,
  RedDirtTransportError,
  type RedDirtTransport,
  withReadRetries,
} from "@/features/reddirt-integration/transport";

export type RedDirtAdapterOptions = {
  apiKey: string;
  baseUrl: string;
  organizationId: string;
  readEnabled: boolean;
  transport?: RedDirtTransport;
};

/**
 * Read-only RedDirt adapter.
 * Refuses network when !readEnabled or missing key.
 * With DOCUMENTATION_PENDING, verification fails closed without inventing endpoints.
 */
export class RedDirtAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly organizationId: string;
  private readonly readEnabled: boolean;
  private readonly transport: RedDirtTransport;
  private networkCallCount = 0;

  constructor(opts: RedDirtAdapterOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.organizationId = opts.organizationId;
    this.readEnabled = opts.readEnabled;
    this.transport = opts.transport ?? createRedDirtFetchTransport();
  }

  getNetworkCallCount() {
    return this.networkCallCount;
  }

  private assertNetworkAllowed() {
    if (!this.readEnabled) {
      throw new RedDirtTransportError({
        message: "RedDirt reads are DISABLED (REDDIRT_READ_ENABLED=false).",
        category: "DISABLED",
      });
    }
    if (!this.apiKey) {
      throw new RedDirtTransportError({
        message: "RedDirt API key missing.",
        category: "NOT_CONFIGURED",
      });
    }
  }

  /**
   * Bounded verify probe. Without a verified contract, returns fail-closed
   * DOCUMENTATION_PENDING and never invents an endpoint path.
   */
  async verifyConnection(): Promise<{
    ok: false;
    state: "DOCUMENTATION_PENDING" | "DISABLED" | "NOT_CONFIGURED";
    message: string;
    networkCalls: number;
  }> {
    if (!this.readEnabled) {
      return {
        ok: false,
        state: "DISABLED",
        message: "REDDIRT_READ_ENABLED is false — no network request made.",
        networkCalls: this.networkCallCount,
      };
    }
    if (!this.apiKey || !this.organizationId) {
      return {
        ok: false,
        state: "NOT_CONFIGURED",
        message: "Missing REDDIRT_API_KEY or REDDIRT_ORGANIZATION_ID.",
        networkCalls: this.networkCallCount,
      };
    }
    if (REDDIRT_DOCS.documentationStatus === "DOCUMENTATION_PENDING") {
      // Fail closed — do not invent GET paths.
      return {
        ok: false,
        state: "DOCUMENTATION_PENDING",
        message:
          "No verified RedDirt read endpoint contract. Use fixture or approved export.",
        networkCalls: this.networkCallCount,
      };
    }
    this.assertNetworkAllowed();
    // Reserved for future verified contract GET — unreachable until docs ship.
    const url = `${this.baseUrl}/health`;
    this.networkCallCount += 1;
    await withReadRetries(() =>
      this.transport({
        method: "GET",
        url,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      }),
    );
    return {
      ok: false,
      state: "DOCUMENTATION_PENDING",
      message: "Unreachable without verified contract.",
      networkCalls: this.networkCallCount,
    };
  }
}
