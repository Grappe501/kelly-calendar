import "server-only";

import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import {
  intelligenceOperationsForAdvisory,
  type OperationalIntelligenceHome,
} from "@/lib/missions/intelligence-operations";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";

const KELLY_AI_AUDIT_ATTRS = {
  application: "kelly-calendar",
  feature: "operational-intelligence",
  operation: "advisory-summary",
} as const;

const ADVISORY_SYSTEM = [
  "You are an advisory operational intelligence analyst for Kelly Calendar.",
  "Answer only from the JSON insights. Each insight cites a canonical source module.",
  "Never override or contradict Field/County/Volunteer/Comms/Logistics/Finance/Compliance facts.",
  "Help leadership: what changed, why it matters, what to look at first. Under 90 words.",
].join(" ");

export async function maybeGenerateIntelligenceOperationsAdvisory(input: {
  actor: AuthenticatedActor;
  intelligence: OperationalIntelligenceHome;
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
        "AI advisory unavailable. Deterministic cross-domain insights remain authoritative.",
      provider: null,
    };
  }

  const payload = intelligenceOperationsForAdvisory(input.intelligence);
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
        max_tokens: 200,
        messages: [
          { role: "system", content: ADVISORY_SYSTEM },
          {
            role: "user",
            content: `Operational intelligence JSON:\n${JSON.stringify(payload)}`,
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
          "AI advisory unavailable. Deterministic cross-domain insights remain authoritative.",
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
          "AI advisory empty. Deterministic cross-domain insights remain authoritative.",
        provider: "openai",
      };
    }
    await safeAudit(input, "AI_ADVISORY_GENERATED", { chars: text.length });
    return {
      status: "advisory",
      label: "Advisory AI summary",
      text,
      uncertaintyNote:
        "Advisory only — insights interpret canonical feeds and never override them.",
      provider: "openai",
    };
  } catch {
    await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { reason: "error" });
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable (timeout/network). Deterministic intelligence remains authoritative.",
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
      entityType: "OperationalIntelligence",
      requestId: input.requestId,
      source: "intelligence-operations-ai",
      metadata: { ...KELLY_AI_AUDIT_ATTRS, ...extra },
    });
  } catch {
    /* ignore */
  }
}
