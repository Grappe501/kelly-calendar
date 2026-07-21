import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getDomainVerificationCenter,
  recordDomainVerificationCheck,
} from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/domains",
    async ({ actor }) => getDomainVerificationCenter(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/providers/domains",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const asStatus = (v: unknown) => {
        const allowed = [
          "UNKNOWN",
          "PASS",
          "FAIL",
          "PENDING",
          "NOT_APPLICABLE",
        ] as const;
        return allowed.includes(v as (typeof allowed)[number])
          ? (v as (typeof allowed)[number])
          : ("PENDING" as const);
      };
      return recordDomainVerificationCheck(actor, {
        providerKey:
          typeof body?.providerKey === "string" ? body.providerKey : "",
        domain: typeof body?.domain === "string" ? body.domain : "",
        spfStatus: asStatus(body?.spfStatus),
        dkimStatus: asStatus(body?.dkimStatus),
        dmarcStatus: asStatus(body?.dmarcStatus),
        senderVerified: body?.senderVerified === true,
        returnPathOk: body?.returnPathOk === true,
        trackingDomainOk: body?.trackingDomainOk === true,
      });
    },
  );
}
