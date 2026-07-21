import { createHash } from "node:crypto";
import {
  getCriteriaDefinition,
  isProhibitedCriteriaKey,
} from "@/lib/missions/v21/communications/audiences/criteria/criteria-registry";
import type {
  AudienceCriteriaDocument,
  CriteriaCondition,
  CriteriaValidationResult,
} from "@/lib/missions/v21/communications/audiences/criteria/criteria-types";

export const AUDIENCE_PREVIEW_LIMIT = 50;
export const AUDIENCE_REVIEW_LIMIT = 250;
export const AUDIENCE_MANIFEST_LIMIT = 500;
export const AUDIENCE_ABSOLUTE_HARD_LIMIT = 2000;

/** Reject arbitrary SQL / Prisma / client filters. */
export function validateAudienceCriteria(
  raw: unknown,
  options?: {
    audienceType?: string;
    channelScope?: string;
  },
): CriteriaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw == null || typeof raw !== "object") {
    return { ok: false, errors: ["CRITERIA_REQUIRED"], warnings, normalized: null };
  }
  const doc = raw as Record<string, unknown>;

  // Hard reject injection shapes
  const blob = JSON.stringify(raw).toLowerCase();
  if (
    blob.includes("select ") ||
    blob.includes("drop ") ||
    blob.includes("prisma") ||
    blob.includes("$queryraw") ||
    blob.includes("where:") ||
    /"sql"\s*:/.test(blob)
  ) {
    return {
      ok: false,
      errors: ["ARBITRARY_SQL_OR_FILTER_REJECTED"],
      warnings,
      normalized: null,
    };
  }

  const match = doc.match === "ANY" ? "ANY" : "ALL";
  const conditionsRaw = Array.isArray(doc.conditions) ? doc.conditions : [];
  if (conditionsRaw.length === 0 && !Array.isArray(doc.staticLocalPersonIds)) {
    errors.push("CRITERIA_EMPTY");
  }

  const conditions: CriteriaCondition[] = [];
  for (const c of conditionsRaw) {
    if (!c || typeof c !== "object") {
      errors.push("CONDITION_MALFORMED");
      continue;
    }
    const cond = c as Record<string, unknown>;
    const key = typeof cond.key === "string" ? cond.key.trim() : "";
    const operator = typeof cond.operator === "string" ? cond.operator : "";
    if (!key) {
      errors.push("CONDITION_KEY_MISSING");
      continue;
    }
    if (isProhibitedCriteriaKey(key)) {
      errors.push(`PROHIBITED_CRITERION:${key}`);
      continue;
    }
    const def = getCriteriaDefinition(key);
    if (!def) {
      errors.push(`UNKNOWN_CRITERION:${key}`);
      continue;
    }
    if (!def.allowedOperators.includes(operator as never)) {
      errors.push(`INVALID_OPERATOR:${key}:${operator}`);
      continue;
    }
    if (
      options?.audienceType &&
      !def.allowedAudienceTypes.includes(options.audienceType as never)
    ) {
      errors.push(`AUDIENCE_TYPE_MISMATCH:${key}`);
    }
    if (
      options?.channelScope &&
      options.channelScope !== "MULTI_CHANNEL" &&
      !def.allowedChannels.includes(options.channelScope as never) &&
      !def.allowedChannels.includes("MULTI_CHANNEL")
    ) {
      warnings.push(`CHANNEL_HINT_MISMATCH:${key}`);
    }
    conditions.push({
      key,
      operator: operator as CriteriaCondition["operator"],
      value: cond.value as CriteriaCondition["value"],
    });
  }

  const staticLocalPersonIds = Array.isArray(doc.staticLocalPersonIds)
    ? doc.staticLocalPersonIds.filter((x): x is string => typeof x === "string")
    : undefined;

  if (staticLocalPersonIds?.some((id) => id.includes("@") || id.includes("+"))) {
    errors.push("STATIC_MEMBER_MUST_BE_PERSON_ID_NOT_DESTINATION");
  }

  const normalized: AudienceCriteriaDocument = {
    schemaVersion: "d24-1",
    match,
    conditions,
    staticLocalPersonIds,
    fabricatedPoolKey:
      typeof doc.fabricatedPoolKey === "string" ? doc.fabricatedPoolKey : undefined,
  };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalized: errors.length === 0 ? normalized : null,
  };
}

export function criteriaContentHash(doc: AudienceCriteriaDocument): string {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}

export function explainCriteria(doc: AudienceCriteriaDocument): string[] {
  return doc.conditions.map((c) => {
    const def = getCriteriaDefinition(c.key);
    const label = def?.label ?? c.key;
    const value =
      c.value === undefined || c.value === null
        ? ""
        : Array.isArray(c.value)
          ? c.value.join(", ")
          : String(c.value);
    return `${label} ${c.operator.toLowerCase().replace(/_/g, " ")}${value ? ` ${value}` : ""}`;
  });
}

export function evaluationLimitForType(
  type: "PREVIEW" | "REVIEW" | "MANIFEST" | "TEST",
  definitionLimit: number,
): number {
  const capped = Math.min(definitionLimit, AUDIENCE_ABSOLUTE_HARD_LIMIT);
  if (type === "PREVIEW" || type === "TEST") {
    return Math.min(capped, AUDIENCE_PREVIEW_LIMIT);
  }
  if (type === "REVIEW") return Math.min(capped, AUDIENCE_REVIEW_LIMIT);
  return Math.min(capped, AUDIENCE_MANIFEST_LIMIT);
}
