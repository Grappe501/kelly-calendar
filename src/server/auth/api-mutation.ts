import "server-only";

import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import {
  requireActiveAuthenticatedActor,
  actorAsSessionViewer,
  type AuthenticatedActor,
} from "@/server/auth/actor";
import { runWithActorAsync } from "@/server/auth/actor-context";
import { getServerEnvironment } from "@/lib/env/server-environment";

export async function withAuthenticatedMutation<T>(
  request: Request,
  path: string,
  handler: (ctx: {
    actor: AuthenticatedActor;
    requestId: string;
  }) => Promise<T>,
): Promise<NextResponse> {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    getServerEnvironment();
    const actor = await requireActiveAuthenticatedActor(request);
    const result = await runWithActorAsync(actorAsSessionViewer(actor), () =>
      handler({ actor, requestId }),
    );
    return NextResponse.json(
      { ok: true, ...(result as object), requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, path);
  }
}

export async function withAuthenticatedQuery<T>(
  request: Request,
  path: string,
  handler: (ctx: {
    actor: AuthenticatedActor;
    requestId: string;
  }) => Promise<T>,
): Promise<NextResponse> {
  return withAuthenticatedMutation(request, path, handler);
}
