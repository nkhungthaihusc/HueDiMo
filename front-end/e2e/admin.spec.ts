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

  test("nhập điểm Google Maps từ JSON và GeoJSON", async ({ page }) => {
    await page.goto("/admin/places");
    const addPlace = page.getByRole("button", { name: "Thêm địa điểm", exact: true });
    const methods = page.getByRole("dialog", { name: "Chọn cách thêm địa điểm" });
    await addPlace.click();
    await methods.getByRole("button", { name: "Nhập thủ công" }).click();
    await expect(page.getByRole("heading", { name: "Thêm Địa điểm Mới" })).toBeVisible();
    const editor = page.getByRole("dialog", { name: "Thêm Địa điểm Mới" });
    await expect.poll(() => editor.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Math.max(Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2),
        Math.abs(bounds.y + bounds.height / 2 - innerHeight / 2));
    })).toBeLessThan(3);
    await page.getByRole("button", { name: "Hủy", exact: true }).filter({ visible: true }).click();
    await addPlace.click();
    await methods.getByRole("button", { name: /Nhập từ tệp/ }).click();
    await page.getByLabel("Danh mục mặc định cho JSON và GeoJSON").selectOption("coffee");
    const input = page.locator('input[type="file"][accept*=".geojson"]');

    await input.setInputFiles({
      name: "Saved Places.JSON", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify([{ Location: { "Business Name": "Cà phê Takeout",
        Address: "Huế", "Geo Coordinates": { Latitude: 16.46, Longitude: 107.59 } } }])),
    });
    await expect(page.getByText("Cà phê Takeout", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Chọn file khác" }).click();

    const preview = page.waitForRequest((request) => request.url().endsWith("/import-csv/preview"));
    await input.setInputFiles({
      name: "locations.geojson", mimeType: "application/geo+json",
      buffer: Buffer.from(JSON.stringify({ type: "FeatureCollection", features: [
        { type: "Feature", geometry: { type: "Point", coordinates: [107.59, 16.46] },
          properties: { Location: { "Business Name": "Cà phê GeoJSON", Address: "Huế" } } },
        { type: "Feature", geometry: { type: "LineString", coordinates: [[107.59, 16.46], [107.60, 16.47]] },
          properties: { name: "Đường đi" } },
      ] })),
    });
    const { items } = (await preview).postDataJSON();
    expect(items[0]).toMatchObject({ name: "Cà phê GeoJSON", address: "Huế", lat: 16.46, lng: 107.59, category: "coffee" });
    expect(items[1]).toMatchObject({ lat: null, lng: null });
    await expect(page.getByText("Cà phê GeoJSON", { exact: true })).toBeVisible();

    const save = page.waitForRequest((request) => request.url().endsWith("/import-csv") && request.method() === "POST");
    await page.getByRole("button", { name: "Xác nhận nhập vào hệ thống" }).click();
    expect((await save).postDataJSON().items).toMatchObject([{ name: "Cà phê GeoJSON" }]);
    await expect(page.getByText("Nhập dữ liệu thành công!", { exact: true })).toBeVisible();
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

test("cuộn danh sách địa điểm giữ nguyên đầu trang và đầu bảng", async ({ page }) => {
  await login(page, admin.email);
  await expect(page).toHaveURL("/admin");
  await page.route("**/api/admin/places?*", async (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const items = Array.from({ length: 15 }, (_, i) => ({ ...place, id: `scroll-${i}`, name: `Địa điểm ${i}` }));
    await route.fulfill({ headers, json: { data: { items, pagination: { total: items.length, totalPages: 1 } } } });
  });
  await page.goto("/admin/places");
  const heading = page.getByRole("heading", { name: "Quản lý Địa điểm Du lịch" });
  const filter = page.getByPlaceholder(/Tìm theo tên, địa chỉ/);
  const tableHead = page.locator("thead");
  const list = page.locator("table").locator("..");
  await expect(tableHead).toBeVisible();
  const position = async () => Promise.all([heading, filter, tableHead].map(async (item) => (await item.boundingBox())?.y));
  const before = await position();
  await list.evaluate((element) => { element.scrollTop = 250; });
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const after = await position();
  after.forEach((y, index) => expect(Math.abs(y! - before[index]!)).toBeLessThan(2));
  expect(await page.locator("main").evaluate((element) => element.scrollTop)).toBe(0);
});

test("API từ chối quyền quản trị thì khóa thao tác và hiện nút đăng xuất", async ({ page }) => {
  await page.route("**/api/admin/stats", async (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 403, headers, json: { error: { code: "FORBIDDEN", message: "Yêu cầu quyền quản trị viên." } } });
  });
  await login(page, admin.email);
  await expect(page.getByRole("alert").getByRole("heading", { name: "Không có quyền quản trị" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Điều hướng quản trị" })).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("hộp thoại đổi quyền căn giữa màn hình khi bảng đã cuộn", async ({ page }) => {
  await login(page, admin.email);
  await expect(page).toHaveURL("/admin");
  await page.route("**/api/admin/users?*", async (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const items = Array.from({ length: 15 }, (_, i) => ({ ...visitor, id: `dialog-${i}`, name: `Du khách ${i}` }));
    return route.fulfill({ headers, json: { data: { items, pagination: { total: items.length, totalPages: 1 } } } });
  });
  await page.goto("/admin/users");
  await page.getByRole("row", { name: /Du khách 14/ }).getByRole("button", { name: /Cấp Admin/i }).click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận thay đổi quyền" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(
      Math.abs(rect.x + rect.width / 2 - innerWidth / 2),
      Math.abs(rect.y + rect.height / 2 - innerHeight / 2),
    );
  })).toBeLessThan(3);
});
