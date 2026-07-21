import { createHash } from "node:crypto";
import { maskDestination, normalizeEmail, normalizePhone } from "@/lib/missions/v21/communications/content";

export type ResolvedDestination = {
  ok: boolean;
  contactPointId: string | null;
  localPersonId: string | null;
  channel: "EMAIL" | "SMS";
  normalized: string | null;
  masked: string | null;
  fingerprint: string | null;
  exclusionReason: string | null;
  phoneCapability: "MOBILE" | "LANDLINE" | "UNKNOWN" | null;
};

export function destinationFingerprint(
  channel: "EMAIL" | "SMS",
  normalized: string,
): string {
  return createHash("sha256")
    .update(`${channel}|${normalized}`)
    .digest("hex");
}

export function normalizeEmailDestination(raw: string): {
  ok: boolean;
  normalized: string | null;
  reason: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, normalized: null, reason: "MISSING_EMAIL" };
  if (/[\r\n]/.test(trimmed)) {
    return { ok: false, normalized: null, reason: "INVALID_EMAIL" };
  }
  const normalized = normalizeEmail(trimmed);
  if (!normalized.includes("@") || normalized.startsWith("@")) {
    return { ok: false, normalized: null, reason: "INVALID_EMAIL" };
  }
  if (/^(test|example|placeholder|asdf)@/i.test(normalized)) {
    // allow in sandbox fabricated pools; flag only for real import paths
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, normalized: null, reason: "INVALID_EMAIL" };
  }
  return { ok: true, normalized, reason: null };
}

export function normalizePhoneDestination(raw: string): {
  ok: boolean;
  normalized: string | null;
  reason: string | null;
} {
  const digits = normalizePhone(raw);
  if (!digits) return { ok: false, normalized: null, reason: "MISSING_PHONE" };
  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, normalized: null, reason: "INVALID_PHONE" };
  }
  const e164 = digits.startsWith("1") && digits.length === 11 ? `+${digits}` : `+1${digits.slice(-10)}`;
  return { ok: true, normalized: e164, reason: null };
}

/**
 * Resolve a contact point for a channel.
 * Does not assume 10-digit numbers are mobile.
 */
export function resolveContactDestination(input: {
  channel: "EMAIL" | "SMS";
  contactPoints: Array<{
    id: string;
    localPersonId: string | null;
    channel: string;
    normalizedDestination: string;
    verificationState: string;
    isActive: boolean;
    /** Explicit capability — never inferred from digit length alone. */
    phoneCapability?: "MOBILE" | "LANDLINE" | "UNKNOWN" | null;
  }>;
  localPersonId: string | null;
}): ResolvedDestination {
  const points = input.contactPoints.filter(
    (p) =>
      p.isActive &&
      p.channel === input.channel &&
      (!input.localPersonId || p.localPersonId === input.localPersonId),
  );
  if (points.length === 0) {
    return {
      ok: false,
      contactPointId: null,
      localPersonId: input.localPersonId,
      channel: input.channel,
      normalized: null,
      masked: null,
      fingerprint: null,
      exclusionReason:
        input.channel === "EMAIL" ? "MISSING_EMAIL" : "MISSING_PHONE",
      phoneCapability: null,
    };
  }

  const preferred = [...points].sort((a, b) => {
    const score = (p: (typeof points)[number]) =>
      (p.verificationState === "VERIFIED" ? 2 : 0) +
      (p.phoneCapability === "MOBILE" ? 1 : 0);
    return score(b) - score(a);
  })[0]!;

  if (input.channel === "EMAIL") {
    const n = normalizeEmailDestination(preferred.normalizedDestination);
    if (!n.ok || !n.normalized) {
      return {
        ok: false,
        contactPointId: preferred.id,
        localPersonId: preferred.localPersonId,
        channel: "EMAIL",
        normalized: null,
        masked: null,
        fingerprint: null,
        exclusionReason: n.reason ?? "INVALID_EMAIL",
        phoneCapability: null,
      };
    }
    return {
      ok: true,
      contactPointId: preferred.id,
      localPersonId: preferred.localPersonId,
      channel: "EMAIL",
      normalized: n.normalized,
      masked: maskDestination("EMAIL", n.normalized),
      fingerprint: destinationFingerprint("EMAIL", n.normalized),
      exclusionReason: null,
      phoneCapability: null,
    };
  }

  const capability = preferred.phoneCapability ?? "UNKNOWN";
  if (capability !== "MOBILE") {
    return {
      ok: false,
      contactPointId: preferred.id,
      localPersonId: preferred.localPersonId,
      channel: "SMS",
      normalized: null,
      masked: null,
      fingerprint: null,
      exclusionReason: "PHONE_CAPABILITY_UNKNOWN",
      phoneCapability: capability,
    };
  }
  const n = normalizePhoneDestination(preferred.normalizedDestination);
  if (!n.ok || !n.normalized) {
    return {
      ok: false,
      contactPointId: preferred.id,
      localPersonId: preferred.localPersonId,
      channel: "SMS",
      normalized: null,
      masked: null,
      fingerprint: null,
      exclusionReason: n.reason ?? "INVALID_PHONE",
      phoneCapability: capability,
    };
  }
  return {
    ok: true,
    contactPointId: preferred.id,
    localPersonId: preferred.localPersonId,
    channel: "SMS",
    normalized: n.normalized,
    masked: maskDestination("SMS", n.normalized),
    fingerprint: destinationFingerprint("SMS", n.normalized),
    exclusionReason: null,
    phoneCapability: capability,
  };
}

export type DedupConflict = {
  type: "DUPLICATE_PERSON" | "DUPLICATE_DESTINATION";
  key: string;
  localPersonIds: string[];
};

export function detectDeduplicationConflicts(
  rows: Array<{
    localPersonId: string | null;
    destinationFingerprint: string | null;
    included: boolean;
  }>,
): DedupConflict[] {
  const conflicts: DedupConflict[] = [];
  const byPerson = new Map<string, number>();
  const byDest = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.included) continue;
    if (row.localPersonId) {
      byPerson.set(row.localPersonId, (byPerson.get(row.localPersonId) ?? 0) + 1);
    }
    if (row.destinationFingerprint && row.localPersonId) {
      const list = byDest.get(row.destinationFingerprint) ?? [];
      list.push(row.localPersonId);
      byDest.set(row.destinationFingerprint, list);
    }
  }

  for (const [personId, count] of byPerson) {
    if (count > 1) {
      conflicts.push({
        type: "DUPLICATE_PERSON",
        key: personId,
        localPersonIds: [personId],
      });
    }
  }
  for (const [fp, people] of byDest) {
    const unique = [...new Set(people)];
    if (unique.length > 1) {
      conflicts.push({
        type: "DUPLICATE_DESTINATION",
        key: fp,
        localPersonIds: unique,
      });
    }
  }
  return conflicts;
}

export function personalizationIntegrityFingerprint(input: {
  localPersonId: string | null;
  contactPointId: string | null;
  channel: string;
  renderArtifactId?: string | null;
}): string {
  return createHash("sha256")
    .update(
      [
        input.localPersonId ?? "",
        input.contactPointId ?? "",
        input.channel,
        input.renderArtifactId ?? "",
      ].join("|"),
    )
    .digest("hex");
}
