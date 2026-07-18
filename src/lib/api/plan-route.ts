import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";

export function makePlanPutRoute(
  path: string,
  handler: (input: {
    actor: AuthenticatedActor;
    eventId: string;
    expectedVersion: number;
    body: unknown;
    requestId: string;
  }) => Promise<unknown>,
) {
  return {
    dynamic: "force-dynamic" as const,
    async PUT(request: Request, context: { params: Promise<{ eventId: string }> }) {
      const { eventId } = await context.params;
      return withAuthenticatedMutation(request, path, async ({ actor, requestId }) => {
        const json = await request.json();
        const expectedVersion = z.number().int().positive().parse(
          (json as { expectedVersion?: number }).expectedVersion,
        );
        try {
          return await handler({
            actor,
            eventId,
            expectedVersion,
            body: json,
            requestId,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new ValidationError("Invalid plan payload.");
          }
          throw error;
        }
      });
    },
  };
}
