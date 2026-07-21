import {
  getTokenDefinition,
  isProhibitedTokenKey,
} from "@/lib/missions/v21/communications/composition/tokens/token-registry";
import type {
  PersonalizationContext,
  TokenResolutionResult,
} from "@/lib/missions/v21/communications/composition/tokens/token-types";

const TOKEN_RE = /\{\{\s*([a-z0-9_.]+)\s*\}\}/gi;

export function extractTokenKeys(template: string): string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(TOKEN_RE)) {
    keys.add(match[1]!.toLowerCase());
  }
  return [...keys];
}

function lookupSource(
  key: string,
  ctx: PersonalizationContext,
): string | null | undefined {
  const [ns, field] = key.split(".", 2);
  if (!ns || !field) return undefined;
  if (ctx.overrides && key in ctx.overrides) return ctx.overrides[key];
  const bag =
    ns === "recipient"
      ? ctx.recipient
      : ns === "mission"
        ? ctx.mission
        : ns === "event"
          ? ctx.event
          : ns === "campaign"
            ? ctx.campaign
            : ns === "communication"
              ? ctx.communication
              : undefined;
  return bag?.[field] ?? bag?.[key] ?? undefined;
}

function applyFallback(
  key: string,
  policy: string,
  literal?: string,
): string | null {
  if (policy === "SAFE_GREETING") return "";
  if (policy === "LITERAL_FALLBACK") return literal ?? "";
  if (policy === "EMPTY_IF_OPTIONAL") return "";
  return null;
}

/**
 * Resolution order: override → canonical field → campaign → fallback → block.
 * Never infer names from email. Never invent greetings like "Hello friend,".
 */
export function resolveTokens(input: {
  templates: string[];
  requiredKeys: string[];
  optionalKeys: string[];
  context: PersonalizationContext;
  channel: "EMAIL" | "SMS";
}): TokenResolutionResult {
  const allKeys = new Set<string>([
    ...input.requiredKeys,
    ...input.optionalKeys,
    ...input.templates.flatMap(extractTokenKeys),
  ]);

  const resolved: Record<string, string> = {};
  const unresolvedRequired: string[] = [];
  const unresolvedOptional: string[] = [];
  const prohibitedAttempted: string[] = [];

  for (const key of allKeys) {
    if (isProhibitedTokenKey(key)) {
      prohibitedAttempted.push(key);
      continue;
    }
    const def = getTokenDefinition(key);
    if (!def) {
      if (input.requiredKeys.includes(key)) unresolvedRequired.push(key);
      else unresolvedOptional.push(key);
      continue;
    }
    if (!def.allowedChannels.includes(input.channel)) {
      unresolvedOptional.push(key);
      continue;
    }
    const raw = lookupSource(key, input.context);
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    if (trimmed) {
      resolved[key] = trimmed;
      continue;
    }
    const fb = applyFallback(key, def.fallbackPolicy, def.literalFallback);
    if (fb !== null && def.fallbackPolicy !== "BLOCK_IF_REQUIRED") {
      resolved[key] = fb;
      continue;
    }
    if (input.requiredKeys.includes(key) || def.fallbackPolicy === "BLOCK_IF_REQUIRED") {
      if (input.requiredKeys.includes(key)) unresolvedRequired.push(key);
      else unresolvedOptional.push(key);
    } else {
      unresolvedOptional.push(key);
      resolved[key] = "";
    }
  }

  const blocked =
    prohibitedAttempted.length > 0 || unresolvedRequired.length > 0;
  return {
    resolved,
    unresolvedRequired,
    unresolvedOptional,
    prohibitedAttempted,
    blocked,
    blockReason: blocked
      ? prohibitedAttempted.length
        ? `RENDER BLOCKED — prohibited tokens: ${prohibitedAttempted.join(",")}`
        : `RENDER BLOCKED — required tokens unresolved: ${unresolvedRequired.join(",")}`
      : null,
  };
}

export function applyResolvedTokens(
  template: string,
  resolved: Record<string, string>,
): string {
  return template.replace(TOKEN_RE, (_, key: string) => {
    const k = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(resolved, k)
      ? resolved[k]!
      : `{{${k}}}`;
  });
}

/** Greeting helper — never invents "Hello friend,". */
export function safeGreeting(firstName: string | null | undefined): string {
  const name = firstName?.trim();
  if (!name) return "Hello,";
  return `Hello ${name},`;
}
