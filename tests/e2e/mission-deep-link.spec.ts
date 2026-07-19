import { expect, test } from "@playwright/test";

/**
 * Browser-level smoke: deep-link route is real and gated (HL-039).
 * Authenticated Open Mission UX is covered by unit + manual operator checks.
 */
test.describe("Open Mission deep link", () => {
  test("unauthenticated /calendar?event= redirects to login", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/calendar?view=day&date=2026-07-20&event=evt_test_deep_link");
    await expect(page).toHaveURL(/\/login/);
    expect(errors).toEqual([]);
  });

  test("invalid returnTo does not open external redirect from calendar entry", async ({
    page,
  }) => {
    await page.goto(
      "/calendar?view=day&event=evt_test&returnTo=https://evil.example/phish",
    );
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).not.toContain("evil.example");
  });
});
