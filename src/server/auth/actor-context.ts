import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { SessionViewer } from "@/server/auth/session";

const storage = new AsyncLocalStorage<SessionViewer>();

export function runWithActor<T>(actor: SessionViewer, fn: () => T): T {
  return storage.run(actor, fn);
}

export async function runWithActorAsync<T>(
  actor: SessionViewer,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(actor, fn);
}

export function getRequestActor(): SessionViewer | null {
  return storage.getStore() ?? null;
}
