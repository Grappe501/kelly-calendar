import { encryptAesGcm, decryptAesGcm } from "@/lib/crypto/aes-gcm";
import {
  getGoogleIntegrationEnv,
  GOOGLE_CALENDAR_READONLY_SCOPE,
} from "@/features/google-integration/config";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/lib/security/safe-error";
import type { GoogleCalendarConnection, GoogleConnectionStatus } from "@prisma/client";

export type SafeConnectionStatus = {
  connected: boolean;
  connectionStatus: GoogleConnectionStatus | "NOT_CONNECTED";
  googleAccountEmail: string | null;
  googleCalendarId: string;
  grantedScopes: string[];
  connectedAt: string | null;
  lastTokenRefreshAt: string | null;
  lastSyncStartedAt: string | null;
  lastSyncCompletedAt: string | null;
  lastSyncStatus: string | null;
  historicalImportedThrough: string | null;
  pendingReconcileCount: number;
  readonlyScopeOk: boolean;
};

export function toSafeConnectionStatus(
  row: GoogleCalendarConnection | null,
): SafeConnectionStatus {
  if (!row) {
    return {
      connected: false,
      connectionStatus: "NOT_CONNECTED",
      googleAccountEmail: null,
      googleCalendarId: getGoogleIntegrationEnv().calendarId,
      grantedScopes: [],
      connectedAt: null,
      lastTokenRefreshAt: null,
      lastSyncStartedAt: null,
      lastSyncCompletedAt: null,
      lastSyncStatus: null,
      historicalImportedThrough: null,
      pendingReconcileCount: 0,
      readonlyScopeOk: false,
    };
  }
  return {
    connected: row.connectionStatus === "CONNECTED" && !row.revokedAt,
    connectionStatus: row.connectionStatus,
    googleAccountEmail: row.googleAccountEmail,
    googleCalendarId: row.googleCalendarId,
    grantedScopes: row.grantedScopes,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    lastTokenRefreshAt: row.lastTokenRefreshAt?.toISOString() ?? null,
    lastSyncStartedAt: row.lastSyncStartedAt?.toISOString() ?? null,
    lastSyncCompletedAt: row.lastSyncCompletedAt?.toISOString() ?? null,
    lastSyncStatus: row.lastSyncStatus,
    historicalImportedThrough: row.historicalImportedThrough?.toISOString() ?? null,
    pendingReconcileCount: row.pendingReconcileCount,
    readonlyScopeOk: row.grantedScopes.includes(GOOGLE_CALENDAR_READONLY_SCOPE),
  };
}

export async function getActiveConnection(): Promise<GoogleCalendarConnection | null> {
  return prisma.googleCalendarConnection.findFirst({
    where: {
      connectionStatus: { in: ["CONNECTED", "REAUTH_REQUIRED", "ERROR"] },
      revokedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function decryptRefreshToken(row: GoogleCalendarConnection): string {
  const env = getGoogleIntegrationEnv();
  if (!env.tokenEncryptionKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google token encryption key is not configured.",
    });
  }
  return decryptAesGcm(
    {
      ciphertext: row.refreshTokenCiphertext,
      iv: row.refreshTokenIv,
      authTag: row.refreshTokenAuthTag,
      encryptionVersion: row.encryptionVersion,
    },
    env.tokenEncryptionKey,
  );
}

export async function storeRefreshToken(input: {
  refreshToken: string | null | undefined;
  googleAccountEmail?: string | null;
  googleAccountSubject?: string | null;
  googleCalendarId: string;
  grantedScopes: string[];
  connectedByUserId: string;
}): Promise<GoogleCalendarConnection> {
  const env = getGoogleIntegrationEnv();
  if (!env.tokenEncryptionKey) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Google token encryption key is not configured.",
    });
  }

  const existing = await getActiveConnection();
  const nextRefresh =
    input.refreshToken && input.refreshToken.trim().length > 0
      ? input.refreshToken
      : existing
        ? decryptRefreshToken(existing)
        : null;

  if (!nextRefresh) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage:
        "Google did not return a refresh token and no prior token is stored. Reconnect with consent prompt.",
    });
  }

  const blob = encryptAesGcm(nextRefresh, env.tokenEncryptionKey);
  const data = {
    googleAccountEmail: input.googleAccountEmail ?? existing?.googleAccountEmail ?? null,
    googleAccountSubject: input.googleAccountSubject ?? existing?.googleAccountSubject ?? null,
    googleCalendarId: input.googleCalendarId,
    refreshTokenCiphertext: blob.ciphertext,
    refreshTokenIv: blob.iv,
    refreshTokenAuthTag: blob.authTag,
    encryptionVersion: blob.encryptionVersion,
    grantedScopes: input.grantedScopes,
    connectionStatus: "CONNECTED" as const,
    connectedByUserId: input.connectedByUserId,
    connectedAt: existing?.connectedAt ?? new Date(),
    revokedAt: null,
    lastSyncStatus: existing?.lastSyncStatus ?? ("NOT_CONFIGURED" as const),
  };

  if (existing) {
    return prisma.googleCalendarConnection.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.googleCalendarConnection.create({ data });
}

export async function markConnectionRevoked(connectionId: string): Promise<void> {
  await prisma.googleCalendarConnection.update({
    where: { id: connectionId },
    data: {
      connectionStatus: "REVOKED",
      revokedAt: new Date(),
      // Destroy ciphertext material
      refreshTokenCiphertext: "REVOKED",
      refreshTokenIv: "REVOKED",
      refreshTokenAuthTag: "REVOKED",
      syncCursor: null,
    },
  });
}
