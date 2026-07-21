import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  addEventObjective,
  addEventParticipantByName,
  addEventPrepOrFollowUp,
  addEventStaffAssignment,
} from "@/server/services/event-editor-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("participant"),
    displayName: z.string().min(1).max(200),
  }),
  z.object({
    op: z.literal("prep"),
    title: z.string().min(1).max(300),
  }),
  z.object({
    op: z.literal("follow_up"),
    title: z.string().min(1).max(300),
  }),
  z.object({
    op: z.literal("objective"),
    title: z.string().min(1).max(300),
  }),
  z.object({
    op: z.literal("staff"),
    label: z.string().max(200).optional(),
    roleType: z.string().optional(),
  }),
]);

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/details",
    async ({ actor }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid details payload.");
      const body = parsed.data;
      if (body.op === "participant") {
        return {
          item: await addEventParticipantByName({
            actor,
            eventId,
            displayName: body.displayName,
          }),
        };
      }
      if (body.op === "prep" || body.op === "follow_up") {
        return {
          item: await addEventPrepOrFollowUp({
            actor,
            eventId,
            kind: body.op,
            title: body.title,
          }),
        };
      }
      if (body.op === "objective") {
        return {
          item: await addEventObjective({
            actor,
            eventId,
            title: body.title,
          }),
        };
      }
      return {
        item: await addEventStaffAssignment({
          actor,
          eventId,
          label: body.label,
          roleType: (body.roleType as never) ?? "CUSTOM",
        }),
      };
    },
  );
}
