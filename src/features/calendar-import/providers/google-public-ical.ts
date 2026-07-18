import { IMPORT_LIMITS } from "@/features/calendar-import/import-limits";
import {
  assertResponseSize,
  validatePublicGoogleIcalSource,
} from "@/features/calendar-import/source-validation";
import { AppError } from "@/lib/security/safe-error";
import { logger } from "@/lib/logging/logger";

export type FetchIcalResult = {
  body: string;
  byteLength: number;
  contentType: string | null;
  sourceFingerprint: string;
  redactedLabel: string;
  finalHostname: string;
};

/**
 * Fetch a validated Google public iCal feed with SSRF controls.
 * Does not log the full source URL.
 */
export async function fetchGooglePublicIcal(
  sourceUrl: string,
  requestId?: string,
): Promise<FetchIcalResult> {
  const validated = validatePublicGoogleIcalSource(sourceUrl);
  let currentUrl = sourceUrl.trim();
  let redirects = 0;
  let response: Response | undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMPORT_LIMITS.requestTimeoutMs);

  try {
    while (redirects <= IMPORT_LIMITS.maxRedirects) {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/calendar, text/plain, */*",
          "User-Agent": "KellyCampaignCommandCalendar-Import/0.3",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new AppError({
            code: "EXTERNAL_SERVICE_ERROR",
            status: 502,
            publicMessage: "Calendar source redirected without a location.",
          });
        }
        const next = new URL(location, currentUrl);
        validatePublicGoogleIcalSource(next.toString());
        currentUrl = next.toString();
        redirects += 1;
        continue;
      }
      break;
    }

    if (!response) {
      throw new AppError({
        code: "EXTERNAL_SERVICE_ERROR",
        status: 502,
        publicMessage: "Calendar source fetch failed.",
      });
    }

    if (!response.ok) {
      throw new AppError({
        code: "EXTERNAL_SERVICE_ERROR",
        status: 502,
        publicMessage: "Google Calendar source returned an error response.",
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    assertResponseSize(buffer.byteLength);

    const contentType = response.headers.get("content-type");
    const body = buffer.toString("utf8");
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        status: 400,
        publicMessage: "Fetched content is not a valid iCalendar feed.",
      });
    }

    logger.info("google_ical_fetched", {
      requestId,
      data: {
        hostname: validated.hostname,
        fingerprint: validated.sourceFingerprint,
        bytes: buffer.byteLength,
        redirects,
      },
    });

    return {
      body,
      byteLength: buffer.byteLength,
      contentType,
      sourceFingerprint: validated.sourceFingerprint,
      redactedLabel: validated.redactedLabel,
      finalHostname: validated.hostname,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError({
        code: "EXTERNAL_SERVICE_ERROR",
        status: 504,
        publicMessage: "Calendar source request timed out.",
      });
    }
    throw new AppError({
      code: "EXTERNAL_SERVICE_ERROR",
      status: 502,
      publicMessage: "Unable to fetch Google Calendar source.",
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }
}
