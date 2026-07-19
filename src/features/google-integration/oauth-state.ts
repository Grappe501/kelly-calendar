import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/lib/security/safe-error";

const STATE_TTL_MS = 10 * 60 * 1000;

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function generateOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export async function persistOAuthState(input: {
  state: string;
  codeVerifier: string;
  createdByUserId: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + STATE_TTL_MS);
  await prisma.googleOAuthPendingState.create({
    data: {
      state: input.state,
      codeVerifier: input.codeVerifier,
      createdByUserId: input.createdByUserId,
      expiresAt,
    },
  });
}

export async function consumeOAuthState(input: {
  state: string;
  actorUserId: string;
}): Promise<{ codeVerifier: string }> {
  const row = await prisma.googleOAuthPendingState.findUnique({
    where: { state: input.state },
  });
  if (!row) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "OAuth state is invalid or already used.",
    });
  }
  await prisma.googleOAuthPendingState.delete({ where: { id: row.id } }).catch(() => undefined);

  if (row.expiresAt.getTime() < Date.now()) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "OAuth state has expired. Start connect again.",
    });
  }
  if (row.createdByUserId !== input.actorUserId) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "OAuth state does not belong to this operator.",
    });
  }
  return { codeVerifier: row.codeVerifier };
}

export async function purgeExpiredOAuthStates(): Promise<number> {
  const result = await prisma.googleOAuthPendingState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
