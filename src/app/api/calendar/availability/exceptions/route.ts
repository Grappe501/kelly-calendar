import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { createException, listExceptions } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignKey: z.string().min(1).max(80).optional(),
  ruleId: z.string().min(1).nullable().optional(),
  subjectType: z.enum(["CANDIDATE", "CAMPAIGN", "CAMPAIGN_USER"]).optional(),
  startDate: z.string().min(8).max(10),
  endDateExclusive: z.string().min(8).max(10),
  startLocalTime: z.string().min(4).max(5).nullable().optional(),
  endLocalTime: z.string().min(4).max(5).nullable().optional(),
  isAllDay: z.boolean().optional(),
  timezone: z.string().min(1).max(80).optional(),
  classification: z.enum([
    "AVAILABLE",
    "PREFERRED",
    "CONSTRAINED",
    "UNAVAILABLE",
    "UNKNOWN",
    "REQUIRES_REVIEW",
  ]),
  label: z.string().min(1).max(200),
  reasonSensitive: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/availability/exceptions",
    async ({ actor }) => {
      const url = new URL(request.url);
      return listExceptions({
        actor,
        campaignKey: url.searchParams.get("campaignKey") ?? undefined,
        includeInactive: url.searchParams.get("includeInactive") === "1",
      });
    },
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/exceptions",
    async ({ actor, requestId }) => {
      const parsed = createSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid availability exception payload.");
      }
      return createException({ actor, data: parsed.data, requestId });
    },
  );
}
