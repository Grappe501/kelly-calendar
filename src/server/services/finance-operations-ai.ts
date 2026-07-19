import "server-only";

import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import {
  financeOperationsForAdvisory,
  type FinanceOperationsHome,
} from "@/lib/missions/finance-operations";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";

const KELLY_AI_AUDIT_ATTRS = {
  application: "kelly-calendar",
  feature: "finance-operations",
  operation: "advisory-summary",
} as const;

const ADVISORY_SYSTEM = [
  "You are an advisory finance & resources operations assistant for Kelly Calendar.",
  "Answer only from the JSON: dual operational vs resource state, finance-lead gaps, Unknown money facts.",
  "Never invent dollar amounts, cash position, or approvals. Never treat Unknown as funded/ready.",
  "Remind that operational state and resource state are separate. Under 80 words.",
].join(" ");

export async function maybeGenerateFinanceOperationsAdvisory(input: {
  actor: AuthenticatedActor;
  finance: FinanceOperationsHome;
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
        "AI advisory unavailable. Deterministic resource readiness remains authoritative.",
      provider: null,
    };
  }

  const payload = financeOperationsForAdvisory(input.finance);
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
            content: `Finance operations JSON:\n${JSON.stringify(payload)}`,
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
          "AI advisory unavailable. Deterministic resource readiness remains authoritative.",
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
          "AI advisory empty. Deterministic resource readiness remains authoritative.",
        provider: "openai",
      };
    }
    await safeAudit(input, "AI_ADVISORY_GENERATED", { chars: text.length });
    return {
      status: "advisory",
      label: "Advisory AI summary",
      text,
      uncertaintyNote:
        "Advisory only — dual operational/resource state is decided deterministically.",
      provider: "openai",
    };
  } catch {
    await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { reason: "error" });
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable (timeout/network). Deterministic finance remains authoritative.",
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
      entityType: "FinanceOperations",
      requestId: input.requestId,
      source: "finance-operations-ai",
      metadata: { ...KELLY_AI_AUDIT_ATTRS, ...extra },
    });
  } catch {
    /* ignore */
  }
}
