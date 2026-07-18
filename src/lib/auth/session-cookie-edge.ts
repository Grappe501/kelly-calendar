/**
 * Edge-safe session cookie decode (Web Crypto).
 * Used by middleware. Node server paths use session-cookie.ts.
 */

export type EdgeSessionPayload = {
  sid: string;
  uid: string;
  role: string;
  exp: number;
};

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signBody(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(mac);
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function decodeSessionCookieEdge(
  raw: string | undefined | null,
  secret: string | undefined,
): Promise<EdgeSessionPayload | null> {
  if (!raw || !secret || secret.length < 32) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  try {
    const expected = await signBody(body, secret);
    if (!timingSafeEqualString(sig, expected)) return null;
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as EdgeSessionPayload;
    if (!payload.sid || !payload.uid || !payload.role || !payload.exp) return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
