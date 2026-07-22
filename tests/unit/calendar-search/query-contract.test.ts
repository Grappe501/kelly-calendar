import { describe, expect, it } from "vitest";
import {
  applyRelativeDates,
  buildAuthorizedSearchBlob,
  canonicalizeCalendarQuery,
  matchEventAgainstQuery,
  parseCalendarQuery,
  queriesAreEquivalent,
  serializeCalendarQuery,
} from "@/lib/calendar/search";
import { rankMatch, normalizeSearchText } from "@/lib/calendar/search/normalize";

describe("CC-07 query contract", () => {
  it("canonicalizes and stably serializes equivalent queries", () => {
    const a = parseCalendarQuery({
      q: "  Heber ",
      statuses: "CONFIRMED,DRAFT",
      pageSize: "50",
    });
    const b = parseCalendarQuery({
      q: "Heber",
      statuses: ["DRAFT", "CONFIRMED"],
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(queriesAreEquivalent(a.query, b.query)).toBe(true);
    expect(serializeCalendarQuery(a.query)).toContain("q=Heber");
  });

  it("rejects unknown filters", () => {
    const parsed = parseCalendarQuery({ hackerField: "1" });
    expect(parsed.ok).toBe(false);
  });

  it("rejects unauthorized campaign scope", () => {
    const parsed = parseCalendarQuery(
      { campaignKey: "other" },
      { campaignKey: "kelly" },
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.unauthorized).toBe(true);
  });

  it("applies TODAY relative dates without freezing save day", () => {
    const base = canonicalizeCalendarQuery({
      schemaVersion: 1,
      relativeDateMode: "TODAY",
    });
    const now = new Date("2026-07-22T18:00:00Z");
    const resolved = applyRelativeDates(base, now);
    expect(resolved.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(resolved.dateFrom).toBe(resolved.dateTo);
  });
});

describe("CC-07 search ranking", () => {
  it("ranks exact ahead of word ahead of substring", () => {
    expect(rankMatch("heber", "heber")).toBe(100);
    expect(rankMatch("heber", "heber springs")).toBe(85);
    expect(rankMatch("heber", "northheber")).toBe(30);
    expect(normalizeSearchText("Heber, Springs!")).toBe("heber springs");
  });

  it("explains authorized matches only", () => {
    const blob = buildAuthorizedSearchBlob({
      title: "County dinner",
      countyName: "Cleburne",
      viewerHasFullNotesAccess: false,
      privateNotes: "SECRET",
    });
    const result = matchEventAgainstQuery(blob, {
      q: "cleburne",
    });
    expect(result.matched).toBe(true);
    expect(result.reasons[0]?.field).toBe("county");
    expect(blob.some((p) => p.field === "notes")).toBe(false);
  });
});
