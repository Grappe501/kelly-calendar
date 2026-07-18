import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session-constants";

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS };

export type SessionCookiePayload = {
  sid: string;
  uid: string;
  role: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("APP_SESSION_SECRET must be set (min 32 characters) for Step 4 sessions");
  }
  return secret;
}

export function isSessionSecretConfigured(): boolean {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function newTokenId(): string {
  return randomBytes(24).toString("base64url");
}

function sign(body: string): string {
  return createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
}

export function encodeSessionCookie(payload: SessionCookiePayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSessionCookie(raw: string | undefined | null): SessionCookiePayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  try {
    const expected = sign(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionCookiePayload;
    if (!payload.sid || !payload.uid || !payload.role || !payload.exp) return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
