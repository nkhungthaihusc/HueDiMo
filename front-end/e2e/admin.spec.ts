import type { Page } from "@playwright/test";
import { test, expect, admin, visitor, password, place } from "./fixtures";

async function login(page: Page, email: string) {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "HueDiMo Console" })).toBeVisible();
  await page.getByPlaceholder("admin@huedimo.vn").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Xác thực Quản trị/ }).click();
}

async function adminNav(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Mở menu quản trị" }).click();
  return page.getByRole("navigation", { name: "Điều hướng quản trị" });
}

test("khách chưa đăng nhập bị chuyển hướng từ trang quản trị", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/(?:admin\/login|login\?redirect=%2Fadmin%2Fusers)$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("tài khoản thường bị từ chối tại cổng quản trị", async ({ page }) => {
  await login(page, visitor.email);
  await expect(page.getByText(/không có quyền Quản trị viên/i)).toBeVisible();
  await expect(page).toHaveURL("/admin/login");
});

test.describe("quản trị viên", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, admin.email);
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { name: "Tổng quan Hệ thống" })).toBeVisible();
  });

  for (const [link, path, heading] of [
    ["Địa điểm", "/admin/places", "Quản lý Địa điểm Du lịch"],
    ["Người dùng", "/admin/users", "Quản lý Người dùng & Phân quyền"],
    ["Lịch trình", "/admin/itineraries", "Quản lý Lộ trình Du lịch"],
    ["Đánh giá", "/admin/reviews", "Kiểm duyệt Đánh giá Du khách"],
    ["Cấu hình AI", "/admin/ai-settings", "Cấu hình Model AI Tư Vấn"],
    ["Nhật ký hệ thống", "/admin/logs", "Giám sát Yêu cầu API"],
  ]) {
    test(`mở trang ${link} từ menu quản trị`, async ({ page, isMobile }) => {
      const nav = await adminNav(page, isMobile);
      await nav.getByRole("link", { name: link, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { name: new RegExp(heading) })).toBeVisible();
    });
  }

  test("lọc địa điểm theo tên", async ({ page }) => {
    await page.goto("/admin/places");
    await expect(page.getByText(place.name, { exact: true })).toBeVisible();
    const search = page.getByPlaceholder(/Tìm theo tên, địa chỉ/);
    await search.fill("không tồn tại");
    const filtered = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/admin/places" &&
      new URL(response.url()).searchParams.get("q") === "không tồn tại");
    await search.press("Enter");
    await filtered;
    await expect(page.getByText(place.name, { exact: true })).toHaveCount(0);
  });

  test("lưu chỉ thị AI và đọc lại sau khi tải trang", async ({ page }) => {
    await page.goto("/admin/ai-settings");
    const instruction = page.getByPlaceholder(/Ưu tiên khuyến khích/);
    const value = "Ưu tiên trải nghiệm di sản Huế.";
    await instruction.fill(value);
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await expect(page.getByText("Đã lưu cấu hình AI thành công!")).toBeVisible();
    await page.reload();
    await expect(instruction).toHaveValue(value);
  });

  test("đăng xuất và mất quyền truy cập trang quản trị", async ({ page, isMobile }) => {
    if (isMobile) await adminNav(page, true);
    const logout = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/logout" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    expect((await logout).ok()).toBe(true);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});
