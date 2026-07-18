import { describe, expect, it } from "vitest";
import { BOTTOM_NAV_ITEMS, resolveActiveNavId } from "@/lib/navigation/nav-items";

describe("navigation configuration", () => {
  it("includes the five primary destinations", () => {
    expect(BOTTOM_NAV_ITEMS.map((item) => item.id)).toEqual([
      "today",
      "calendar",
      "add",
      "search",
      "more",
    ]);
  });

  it("resolves active ids from pathnames", () => {
    expect(resolveActiveNavId("/")).toBe("today");
    expect(resolveActiveNavId("/calendar")).toBe("calendar");
    expect(resolveActiveNavId("/add")).toBe("add");
    expect(resolveActiveNavId("/search")).toBe("search");
    expect(resolveActiveNavId("/system/status")).toBe("more");
  });
});
