/** Escape HTML for safe previews — never execute scripts. */
export function sanitizeMessagePreviewHtml(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip formula-injection prefixes for CSV/export cells. */
export function sanitizeExportCell(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

export function maskDestination(channel: string, normalized: string): string {
  if (!normalized) return "(empty)";
  if (channel === "EMAIL") {
    const [user, domain] = normalized.split("@");
    if (!domain) return "***";
    const u = user.length <= 2 ? "*" : `${user[0]}***${user[user.length - 1]}`;
    return `${u}@${domain}`;
  }
  if (channel === "SMS" || channel === "PHONE") {
    const digits = normalized.replace(/\D/g, "");
    if (digits.length < 4) return "***";
    return `***-***-${digits.slice(-4)}`;
  }
  return "***";
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits;
}

export function estimateSmsSegments(body: string): {
  length: number;
  segments: number;
} {
  const length = [...body].length;
  const segments = length === 0 ? 0 : Math.ceil(length / 160);
  return { length, segments };
}

export function renderContentPreview(input: {
  channel: string;
  subject: string | null;
  bodyText: string | null;
  mobilizeEventUrl: string | null;
}): {
  subject: string | null;
  bodySafe: string;
  mobilizeEventUrl: string | null;
  smsEstimate: { length: number; segments: number } | null;
} {
  const body = input.bodyText ?? "";
  const withLink =
    input.mobilizeEventUrl && !body.includes(input.mobilizeEventUrl)
      ? `${body}\n\n${input.mobilizeEventUrl}`
      : body;
  return {
    subject: input.channel === "EMAIL" ? input.subject : null,
    bodySafe: sanitizeMessagePreviewHtml(withLink),
    mobilizeEventUrl: input.mobilizeEventUrl,
    smsEstimate:
      input.channel === "SMS" ? estimateSmsSegments(withLink) : null,
  };
}

/** Forbidden operational fields — never inject into outreach content. */
export const FORBIDDEN_CONTENT_FIELD_HINTS = [
  "driver",
  "passenger",
  "custody",
  "incident",
  "field ops exception",
  "confidential staffing",
  "private phone",
  "private email",
] as const;
