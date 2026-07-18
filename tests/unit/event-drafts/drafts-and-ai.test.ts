import { describe, expect, it } from "vitest";
import { eventTypesForCalendar } from "@/features/event-drafts/arkansas-counties";
import { stagedEventDraftSchema } from "@/features/event-drafts/draft-schema";
import { getPreset } from "@/features/event-drafts/event-presets";
import {
  AI_ASSISTANCE_STATUS,
  assertSuggestionSafe,
  buildOfflinePlanningSuggestions,
} from "@/features/event-drafts/planning-suggestions";

describe("event drafts and AI contracts", () => {
  it("changes event types based on calendar", () => {
    expect(eventTypesForCalendar("Fundraising")).toContain("Call time");
    expect(eventTypesForCalendar("Public Events")).toContain("Festival");
  });

  it("validates draft dropdown enums server-side", () => {
    const ok = stagedEventDraftSchema.safeParse({
      basic: {
        primaryCalendar: "Public Events",
        eventType: "Festival",
        internalTitle: "Demo",
        campaignDisplayTitle: "Demo",
      },
    });
    expect(ok.success).toBe(true);

    const bad = stagedEventDraftSchema.safeParse({
      basic: {
        primaryCalendar: "Not A Real Calendar",
        eventType: "Festival",
        internalTitle: "Demo",
        campaignDisplayTitle: "Demo",
      },
    });
    expect(bad.success).toBe(false);
  });

  it("applies editable presets", () => {
    const preset = getPreset("festival");
    expect(preset?.primaryCalendar).toBe("Public Events");
    expect(preset?.defaults.packingItems?.length).toBeGreaterThan(0);
  });

  it("keeps AI disabled and suggestions approval-gated", () => {
    expect(AI_ASSISTANCE_STATUS.aiEnabled).toBe(false);
    expect(AI_ASSISTANCE_STATUS.unreviewedImportsEligibleAsPatterns).toBe(false);
    const suggestions = buildOfflinePlanningSuggestions({
      basic: { primaryCalendar: "Fundraising" },
    });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions) {
      expect(assertSuggestionSafe(suggestion)).toBe(true);
      expect(suggestion.requiresHumanApproval).toBe(true);
      expect(suggestion.evidence.length).toBeGreaterThan(0);
    }
  });
});
