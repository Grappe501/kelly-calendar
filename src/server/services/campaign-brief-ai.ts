import "server-only";

import {
  campaignBriefForAdvisory,
  type CampaignBrief,
  type CampaignBriefAdvisory,
} from "@/lib/missions/campaign-brief";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";

/** Permanent attribution for shared-key billing separation. */
export const KELLY_AI_AUDIT_ATTRS = {
  application: "kelly-calendar",
  feature: "campaign-brief",
  operation: "advisory-summary",
} as const;

export type { CampaignBriefAdvisory };

const ADVISORY_SYSTEM = [
  "You are an advisory campaign operations assistant for Kelly Calendar.",
  "Summarize ONLY the provided JSON brief for leadership.",
  "Do not invent missions, counties, conflicts, people, or travel facts.",
  "If data is partial or unknown, say so explicitly.",
  "Do not instruct anyone to send messages, schedule, assign, or mutate records.",
  "Keep the summary under 80 words. Plain language. No markdown headings.",
].join(" ");

/**
 * Optional advisory narrative. Never required for the brief to work.
 * Failures return unavailable — never throw to callers.
 */
export async function maybeGenerateCampaignBriefAdvisory(input: {
  actor: AuthenticatedActor;
  brief: CampaignBrief;
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
        "AI advisory unavailable (key or provider not configured). Deterministic brief remains authoritative.",
      provider: null,
    };
  }

  const payload = campaignBriefForAdvisory(input.brief);
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
            content: `Deterministic campaign brief JSON:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", {
        httpStatus: res.status,
      });
      return {
        status: "unavailable",
        label: "Advisory AI summary",
        text: null,
        uncertaintyNote:
          "AI advisory unavailable right now. Deterministic brief remains authoritative.",
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
          "AI advisory returned empty content. Deterministic brief remains authoritative.",
        provider: "openai",
      };
    }

    await safeAudit(input, "AI_ADVISORY_GENERATED", {
      chars: text.length,
    });

    return {
      status: "advisory",
      label: "Advisory AI summary",
      text,
      uncertaintyNote:
        "Advisory only — not a decision record. Verify against the deterministic brief above.",
      provider: "openai",
    };
  } catch {
    await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { reason: "error" });
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable (timeout or network). Deterministic brief remains authoritative.",
      provider: "openai",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function safeAudit(
  input: {
    actor: AuthenticatedActor;
    requestId?: string;
  },
  action: string,
  extra: Record<string, unknown>,
) {
  try {
    await writeAttributedAudit({
      actor: input.actor,
      action,
      entityType: "CampaignBrief",
      requestId: input.requestId,
      source: "campaign-brief-ai",
      metadata: {
        ...KELLY_AI_AUDIT_ATTRS,
        ...extra,
      },
    });
  } catch {
    /* never block brief on audit failure */
  }
}
