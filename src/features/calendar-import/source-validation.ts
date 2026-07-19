import { createHash } from "node:crypto";
import {
  GOOGLE_ICAL_HOST_ALLOWLIST,
  IMPORT_LIMITS,
} from "@/features/calendar-import/import-limits";
import { AppError } from "@/lib/security/safe-error";

export type ValidatedPublicIcalSource = {
  ok: true;
  sourceType: "PUBLIC_ICAL";
  hostname: string;
  pathname: string;
  sourceFingerprint: string;
  redactedLabel: string;
};

export type ValidatedPrivateIcalSource = {
  ok: true;
  sourceType: "PRIVATE_ICAL_ENV";
  hostname: string;
  sourceFingerprint: string;
  /** Safe display label — never includes private path tokens or query secrets. */
  redactedLabel: string;
};

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0"
  ) {
    return true;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

export function fingerprintSourceUrl(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex").slice(0, 16);
}

export function redactSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    // Secret Google iCal addresses put a bearer token in the path (/private-…/).
    // Never echo path segments or query strings for those feeds.
    if (path.includes("/private") || path.includes("/private-")) {
      return `https://${parsed.hostname}/calendar/ical/[redacted]/private/[redacted]`;
    }
    const pathHint =
      parsed.pathname.length > 24
        ? `${parsed.pathname.slice(0, 12)}…${parsed.pathname.slice(-8)}`
        : parsed.pathname;
    return `${parsed.protocol}//${parsed.hostname}${pathHint}?[redacted]`;
  } catch {
    return "[invalid-source]";
  }
}

export function redactPrivateIcalLabel(fingerprint: string): string {
  return `google-private-ical#fp:${fingerprint}`;
}

/**
 * Validate a public Google Calendar iCal URL.
 * Rejects non-HTTPS, non-allowlisted hosts, file/local URLs.
 * Never returns the full secret link in status payloads — callers must not echo it.
 */
export function validatePublicGoogleIcalSource(rawUrl: string): ValidatedPublicIcalSource {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Calendar source URL is required.",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Calendar source URL is not a valid URL.",
    });
  }

  if (parsed.protocol !== "https:") {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Only HTTPS Google Calendar sources are permitted.",
    });
  }

  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Local or private network calendar sources are not permitted.",
    });
  }

  const host = parsed.hostname.toLowerCase();
  if (!(GOOGLE_ICAL_HOST_ALLOWLIST as readonly string[]).includes(host)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Calendar host is not on the approved Google Calendar allowlist.",
    });
  }

  // Typical public iCal paths: /calendar/ical/... or /calendar/feeds/...
  const path = parsed.pathname.toLowerCase();
  const looksLikeIcal =
    path.includes("/ical/") ||
    path.includes("/feeds/") ||
    path.endsWith(".ics") ||
    parsed.searchParams.has("cid") ||
    path.includes("calendar");

  if (!looksLikeIcal) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "URL does not look like a Google Calendar iCal source.",
    });
  }

  const fingerprint = fingerprintSourceUrl(trimmed);
  return {
    ok: true,
    sourceType: "PUBLIC_ICAL",
    hostname: host,
    pathname: parsed.pathname,
    sourceFingerprint: fingerprint,
    redactedLabel: redactSourceUrl(trimmed),
  };
}

export function assertImportFloor(startsAtIso: string): void {
  const start = new Date(startsAtIso);
  const floor = new Date("2025-11-01T00:00:00-05:00");
  if (Number.isNaN(start.getTime())) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Import start date is invalid.",
    });
  }
  if (start.getTime() < floor.getTime()) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Import start cannot be before November 1, 2025 without a later authorized override.",
    });
  }
}

export function assertResponseSize(byteLength: number): void {
  if (byteLength > IMPORT_LIMITS.maxResponseBytes) {
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 413,
      publicMessage: "Calendar feed exceeds the maximum allowed size.",
    });
  }
}

/**
 * Validate a Google private/secret iCal URL (server-side env only).
 * Never returns path tokens suitable for reconstruction of the secret address.
 */
export function validatePrivateGoogleIcalSource(rawUrl: string): ValidatedPrivateIcalSource {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "KCCC Google Calendar iCal URL is not configured.",
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Configured Google Calendar iCal URL is invalid.",
    });
  }

  if (parsed.protocol !== "https:") {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Configured Google Calendar iCal URL must use HTTPS.",
    });
  }

  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Configured Google Calendar iCal URL host is not permitted.",
    });
  }

  const host = parsed.hostname.toLowerCase();
  if (!(GOOGLE_ICAL_HOST_ALLOWLIST as readonly string[]).includes(host)) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "Configured Google Calendar iCal host is not on the approved allowlist.",
    });
  }

  const path = parsed.pathname.toLowerCase();
  const looksLikePrivateIcal =
    (path.includes("/ical/") || path.endsWith(".ics") || path.includes("/feeds/")) &&
    (path.includes("/private") || path.includes("/private-"));

  if (!looksLikePrivateIcal) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage:
        "Configured URL does not look like a Google private iCal address. Use the secret iCal address, not an embed URL.",
    });
  }

  const fingerprint = fingerprintSourceUrl(trimmed);
  return {
    ok: true,
    sourceType: "PRIVATE_ICAL_ENV",
    hostname: host,
    sourceFingerprint: fingerprint,
    redactedLabel: redactPrivateIcalLabel(fingerprint),
  };
}
