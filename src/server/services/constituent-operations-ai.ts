import "server-only";

import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import {
  constituentOperationsForAdvisory,
  type ConstituentOperationsHome,
} from "@/lib/missions/constituent-operations";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";

const KELLY_AI_AUDIT_ATTRS = {
  application: "kelly-calendar",
  feature: "constituent-operations",
  operation: "advisory-summary",
} as const;

const ADVISORY_SYSTEM = [
  "You are an advisory voter & constituent operations assistant for Kelly Calendar.",
  "Answer only from the JSON: follow-ups, engagement readiness, Unknown CRM facts.",
  "Never invent voter lists, endorsements, or PII. Never treat Unknown as zero coverage.",
  "Remind this is not a CRM. Under 80 words.",
].join(" ");

export async function maybeGenerateConstituentOperationsAdvisory(input: {
  actor: AuthenticatedActor;
  constituents: ConstituentOperationsHome;
  requestId?: string;
  enabled?: boolean;
}): Promise<CampaignBriefAdvisory> {
  if (input.enabled === false) {
    return {
      status: "skipped",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote: null,
      provider: null,
    };
  }

  let apiKey: string | undefined;
  try {
    apiKey = getServerEnvironment().openAiApiKey;
  } catch {
    apiKey = undefined;
  }
  if (!apiKey) {
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable. Deterministic relationship readiness remains authoritative.",
      provider: null,
    };
  }

  const payload = constituentOperationsForAdvisory(input.constituents);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          { role: "system", content: ADVISORY_SYSTEM },
          {
            role: "user",
            content: `Constituent operations JSON:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { httpStatus: res.status });
      return {
        status: "unavailable",
        label: "Advisory AI summary",
        text: null,
        uncertaintyNote:
          "AI advisory unavailable. Deterministic relationship readiness remains authoritative.",
        provider: "openai",
      };
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim() || null;
    if (!text) {
      return {
        status: "unavailable",
        label: "Advisory AI summary",
        text: null,
        uncertaintyNote:
          "AI advisory empty. Deterministic relationship readiness remains authoritative.",
        provider: "openai",
      };
    }
    await safeAudit(input, "AI_ADVISORY_GENERATED", { chars: text.length });
    return {
      status: "advisory",
      label: "Advisory AI summary",
      text,
      uncertaintyNote:
        "Advisory only — relationship readiness is decided deterministically.",
      provider: "openai",
    };
  } catch {
    await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { reason: "error" });
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable (timeout/network). Deterministic constituents remain authoritative.",
      provider: "openai",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function safeAudit(
  input: { actor: AuthenticatedActor; requestId?: string },
  action: string,
  extra: Record<string, unknown>,
) {
  try {
    await writeAttributedAudit({
      actor: input.actor,
      action,
      entityType: "ConstituentOperations",
      requestId: input.requestId,
      source: "constituent-operations-ai",
      metadata: { ...KELLY_AI_AUDIT_ATTRS, ...extra },
    });
  } catch {
    /* ignore */
  }
}
