import { expect, test } from "@playwright/test";

test.describe("KCCC mobile shell", () => {
  test("root page loads with development warning and nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Kelly’s Day/i })).toBeVisible();
    await expect(
      page.getByText("Internal development build — authentication is not yet enabled."),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });

  test("primary shell routes open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Calendar" }).click();
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Search" }).click();
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();

    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "More" }).click();
    await expect(page.getByRole("heading", { name: "More" })).toBeVisible();

    await page.getByRole("link", { name: "System status page" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "System status" })).toBeVisible();
  });

  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.productCode).toBe("KCCC");
  });
});
