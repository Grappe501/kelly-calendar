import { expect, test } from "@playwright/test";

test.describe("KCCC Step 3 shell", () => {
  test("root page loads with security warning and availability notes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Kelly’s Day/i })).toBeVisible();
    await expect(
      page.getByText(/authentication is not yet enabled/i),
    ).toBeVisible();
    await expect(page.getByText(/Little Rock/i)).toBeVisible();
    await expect(page.getByText(/8:00 AM–12:00 PM/i)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test("system environment and security pages load", async ({ page }) => {
    await page.goto("/system/status");
    await expect(page.getByRole("heading", { level: 1, name: "System status" })).toBeVisible();
    await expect(
      page.getByRole("paragraph").filter({
        hasText: /Do not enter real candidate schedule information/i,
      }),
    ).toBeVisible();

    await page.goto("/system/environment");
    await expect(page.getByRole("heading", { level: 1, name: "Environment readiness" })).toBeVisible();

    await page.goto("/system/security");
    await expect(page.getByRole("heading", { level: 1, name: "Security status" })).toBeVisible();
    await expect(page.getByText(/not full production certification/i)).toBeVisible();

    await page.goto("/system/visibility");
    await expect(page.getByRole("heading", { level: 1, name: "Calendar visibility" })).toBeVisible();
    await expect(
      page.getByText(/demonstration visibility examples/i),
    ).toBeVisible();
    await expect(page.getByText("Fundraising").first()).toBeVisible();
    await expect(page.getByText(/Women for Kelly Reception/i).first()).toBeVisible();
  });

  test("import and quick-add pages load", async ({ page }) => {
    await page.goto("/import/google-calendar");
    await expect(page.getByRole("heading", { level: 1, name: /Import Google Calendar/i })).toBeVisible();
    await expect(page.getByText(/November 1, 2025/i).first()).toBeVisible();
    await expect(page.getByText(/Database writes are disabled/i).first()).toBeVisible();

    await page.goto("/add/quick");
    await expect(page.getByRole("heading", { level: 1, name: /Quick entry/i })).toBeVisible();
    await expect(page.getByText(/DRAFT — NOT YET ON LIVE CALENDAR/i).first()).toBeVisible();
  });

  test("APIs return safe JSON without secrets", async ({ request }) => {
    for (const path of [
      "/api/health",
      "/api/system/status",
      "/api/system/environment",
      "/api/system/security",
      "/api/system/visibility",
      "/api/system/imports",
    ]) {
      const response = await request.get(path);
      expect(response.ok()).toBeTruthy();
      const text = await response.text();
      expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
      expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^"'\s]+:[^"'\s]+@/i);
      const json = JSON.parse(text);
      expect(json.ok === true || json.application?.ready === true).toBeTruthy();
    }
  });
});
