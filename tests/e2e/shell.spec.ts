import { expect, test } from "@playwright/test";

test.describe("KCCC Step 4 shell", () => {
  test("unauthenticated root redirects to login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expect(
      page.getByText(/Step 4 authentication/i),
    ).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test("protected APIs return 401 without session", async ({ request }) => {
    const response = await request.get("/api/system/status");
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("public health and auth status remain reachable", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const text = await health.text();
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{10,}/);
    expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^"'\s]+:[^"'\s]+@/i);

    const authStatus = await request.get("/api/auth/status");
    expect(authStatus.ok()).toBeTruthy();
    const json = await authStatus.json();
    expect(json.ok).toBe(true);
  });
});
