import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { createRule, listRules } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignKey: z.string().min(1).max(80).optional(),
  subjectType: z.enum(["CANDIDATE", "CAMPAIGN", "CAMPAIGN_USER"]).optional(),
  subjectUserId: z.string().min(1).optional(),
  ruleType: z.enum([
    "GENERAL_AVAILABILITY",
    "PREFERRED_WINDOW",
    "UNAVAILABLE_WINDOW",
    "PROTECTED_WORK",
    "OFFICE_HOURS",
    "TRAVEL_BUFFER",
    "PREPARATION_BUFFER",
    "RECOVERY_BUFFER",
    "VACATION",
    "BLACKOUT",
    "OTHER",
  ]),
  classification: z.enum([
    "AVAILABLE",
    "PREFERRED",
    "CONSTRAINED",
    "UNAVAILABLE",
    "UNKNOWN",
    "REQUIRES_REVIEW",
  ]),
  timezone: z.string().min(1).max(80).optional(),
  effectiveStartDate: z.string().min(8).max(10),
  effectiveEndDate: z.string().min(8).max(10).nullable().optional(),
  startLocalTime: z.string().min(4).max(5).nullable().optional(),
  endLocalTime: z.string().min(4).max(5).nullable().optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(24 * 60).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  label: z.string().min(1).max(200),
  reasonSensitive: z.string().max(2000).nullable().optional(),
  locationHint: z.string().max(300).nullable().optional(),
  visibilityNote: z.string().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/availability/rules",
    async ({ actor }) => {
      const url = new URL(request.url);
      return listRules({
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
    "/api/calendar/availability/rules",
    async ({ actor, requestId }) => {
      const parsed = createSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid availability rule payload.");
      }
      return createRule({ actor, data: parsed.data, requestId });
    },
  );
}
