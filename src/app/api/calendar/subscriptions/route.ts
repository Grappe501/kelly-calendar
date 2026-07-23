import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  createSubscriptionFeed,
  listSubscriptionFeeds,
} from "@/server/services/calendar-ics-export-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/subscriptions",
    async ({ actor }) => listSubscriptionFeeds({ actor }),
  );
}

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  privacyProfile: z.enum(["BUSY_ONLY", "CITY_ONLY", "OPERATIONAL_REDACTED"]),
  scopeType: z.enum(["DATE_RANGE", "RELATIVE_WINDOW", "SAVED_VIEW", "CANONICAL_QUERY"]),
  savedViewId: z.string().min(1).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  dateWindowPolicy: z.record(z.string(), z.unknown()).optional(),
  includedStatuses: z.array(z.string()).optional(),
  includeCancelledHistory: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/subscriptions",
    async ({ actor }) => {
      const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid subscription create body.");
      return createSubscriptionFeed({
        actor,
        name: parsed.data.name,
        description: parsed.data.description,
        privacyProfile: parsed.data.privacyProfile,
        scopeType: parsed.data.scopeType,
        savedViewId: parsed.data.savedViewId,
        query: parsed.data.query,
        dateWindowPolicy: parsed.data.dateWindowPolicy,
        includedStatuses: parsed.data.includedStatuses,
        includeCancelledHistory: parsed.data.includeCancelledHistory,
        expiresAt: parsed.data.expiresAt,
      });
    },
  );
}
