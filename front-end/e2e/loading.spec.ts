import { test, expect, visitor, password } from "./fixtures";

test("splash chờ API địa điểm và khôi phục phiên hết hạn", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();

  const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
  let release!: () => void;
  const waitForRefresh = new Promise<void>((resolve) => { release = resolve; });
  let refreshCount = 0;
  await page.route("**/api/auth/me", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const authorized = route.request().headers().authorization === "Bearer renewed-token";
    return route.fulfill({ headers, status: authorized ? 200 : 401, json: { data: { user: visitor } } });
  });
  await page.route("**/api/auth/refresh", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    refreshCount++;
    await waitForRefresh;
    return route.fulfill({ headers, json: { data: { user: visitor, accessToken: "renewed-token", refreshToken: "renewed-refresh" } } });
  });

  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Đang tải bản đồ và địa điểm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveCount(0);
  await expect.poll(() => refreshCount).toBe(1);
  release();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();
  expect(refreshCount).toBe(1);
});
