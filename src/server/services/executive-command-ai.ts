import "server-only";

import {
  executiveCommandForAdvisory,
  type ExecutiveCommand,
} from "@/lib/missions/executive-command";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import { getServerEnvironment } from "@/lib/env/server-environment";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { writeAttributedAudit } from "@/server/services/audit-write";

const KELLY_AI_AUDIT_ATTRS = {
  application: "kelly-calendar",
  feature: "executive-command",
  operation: "advisory-summary",
} as const;

const ADVISORY_SYSTEM = [
  "You are an advisory executive briefing assistant for Kelly Calendar.",
  "Summarize ONLY the provided JSON for a 60-second morning read.",
  "Do not invent missions, counties, volunteers, deadlines, or conflicts.",
  "If fields are unknown, say so. Do not instruct mutations or messaging.",
  "Under 70 words. Plain language. No markdown headings.",
].join(" ");

export async function maybeGenerateExecutiveCommandAdvisory(input: {
  actor: AuthenticatedActor;
  command: ExecutiveCommand;
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
        "AI advisory unavailable. Deterministic briefing remains authoritative.",
      provider: null,
    };
  }

  const payload = executiveCommandForAdvisory(input.command);
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
        max_tokens: 160,
        messages: [
          { role: "system", content: ADVISORY_SYSTEM },
          {
            role: "user",
            content: `Executive command JSON:\n${JSON.stringify(payload)}`,
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
          "AI advisory unavailable right now. Deterministic briefing remains authoritative.",
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
          "AI advisory returned empty content. Deterministic briefing remains authoritative.",
        provider: "openai",
      };
    }

    await safeAudit(input, "AI_ADVISORY_GENERATED", { chars: text.length });
    return {
      status: "advisory",
      label: "Advisory AI summary",
      text,
      uncertaintyNote:
        "Advisory only — verify against the deterministic briefing above.",
      provider: "openai",
    };
  } catch {
    await safeAudit(input, "AI_ADVISORY_UNAVAILABLE", { reason: "error" });
    return {
      status: "unavailable",
      label: "Advisory AI summary",
      text: null,
      uncertaintyNote:
        "AI advisory unavailable (timeout or network). Deterministic briefing remains authoritative.",
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
      entityType: "ExecutiveCommand",
      requestId: input.requestId,
      source: "executive-command-ai",
      metadata: { ...KELLY_AI_AUDIT_ATTRS, ...extra },
    });
  } catch {
    /* never block command on audit failure */
  }
}
