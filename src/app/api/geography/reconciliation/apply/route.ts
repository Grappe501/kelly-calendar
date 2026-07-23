import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  applyEventGeography,
  applyMissionGeography,
} from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/geography/reconciliation/apply",
    async ({ actor }) => {
      const body = (await request.json().catch(() => ({}))) as {
        subjectType?: string;
        subjectId?: string;
        fingerprint?: string;
        authoritativeId?: string;
        rawText?: string;
        countyContext?: string;
        operatorConfirmed?: boolean;
        operatorCountyId?: string;
        operatorPlaceAuthorityId?: string;
      };
      const subjectType = (body.subjectType ?? "").toUpperCase();
      const subjectId = (body.subjectId ?? "").trim();
      if (!subjectId) throw new ValidationError("subjectId is required.");
      const input = {
        authoritativeId: body.authoritativeId,
        rawText: body.rawText,
        countyContext: body.countyContext,
        operatorConfirmed: Boolean(body.operatorConfirmed),
        operatorCountyId: body.operatorCountyId,
        operatorPlaceAuthorityId: body.operatorPlaceAuthorityId,
        fingerprint: body.fingerprint,
      };
      if (subjectType === "EVENT") {
        return applyEventGeography(actor, { ...input, eventId: subjectId });
      }
      if (subjectType === "MISSION") {
        return applyMissionGeography(actor, {
          ...input,
          missionId: subjectId,
        });
      }
      throw new ValidationError("subjectType must be EVENT or MISSION.");
    },
  );
}
