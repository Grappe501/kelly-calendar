import { describe, expect, it } from "vitest";
import { BOTTOM_NAV_ITEMS, resolveActiveNavId } from "@/lib/navigation/nav-items";

describe("Step 6 bottom nav contract", () => {
  it("exposes Today | Calendar | Add | Search | More", () => {
    expect(BOTTOM_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Today",
      "Calendar",
      "Add",
      "Search",
      "More",
    ]);
  });

  it("marks Add as prominent", () => {
    const add = BOTTOM_NAV_ITEMS.find((i) => i.id === "add");
    expect(add?.prominent).toBe(true);
    expect(add?.href).toBe("/add");
  });

  it("resolves active ids for shell routes", () => {
    expect(resolveActiveNavId("/")).toBe("today");
    expect(resolveActiveNavId("/calendar")).toBe("calendar");
    expect(resolveActiveNavId("/add/quick")).toBe("add");
    expect(resolveActiveNavId("/search")).toBe("search");
    expect(resolveActiveNavId("/more")).toBe("more");
    expect(resolveActiveNavId("/system/status")).toBe("more");
    expect(resolveActiveNavId("/brief")).toBe("more");
  });
});
