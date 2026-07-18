import { describe, expect, it } from "vitest";
import { evaluateRecommendations } from "@/features/operational-intelligence/rules/rule-evaluator";

describe("deterministic recommendations", () => {
  it("festival rules generate packing and photographer suggestions", () => {
    const recs = evaluateRecommendations({ eventType: "Festival Appearance" });
    expect(recs.some((r) => /tent|photographer|weather/i.test(r.title))).toBe(true);
    expect(recs.every((r) => r.requiresHumanApproval)).toBe(true);
    expect(recs.every((r) => r.reasons.length > 0)).toBe(true);
    expect(recs.every((r) => r.confidence >= 0 && r.confidence <= 1)).toBe(true);
  });

  it("fundraiser rules generate compliance suggestions", () => {
    const recs = evaluateRecommendations({ eventType: "Fundraiser" });
    expect(recs.some((r) => /finance|compliance/i.test(r.title))).toBe(true);
  });

  it("debate rules generate preparation suggestions", () => {
    const recs = evaluateRecommendations({ eventType: "Debate" });
    expect(recs.some((r) => /mock|rapid-response/i.test(r.title))).toBe(true);
  });

  it("protected context suppresses public communications recommendations", () => {
    const recs = evaluateRecommendations({
      eventType: "Festival Appearance",
      calendarType: "PROTECTED_PERSONAL",
      locationDisclosure: "HIDDEN",
    });
    expect(recs.some((r) => r.id === "rec_suppress_public_promo")).toBe(true);
    expect(recs.every((r) => r.recommendationType !== "COMMUNICATIONS")).toBe(true);
  });

  it("rejected recommendation does not immediately repeat", () => {
    const rejected = new Set(["rec_festival_photographer"]);
    const recs = evaluateRecommendations(
      { eventType: "Festival Appearance" },
      { rejectedKeys: rejected },
    );
    expect(recs.some((r) => r.id === "rec_festival_photographer")).toBe(false);
  });
});
