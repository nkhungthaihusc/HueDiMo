import type { Page } from "@playwright/test";
import { test, expect, itinerarySummary, password, place, savedItineraryId, visitor } from "./fixtures";

async function openFeature(page: Page, name: string) {
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Tất cả chức năng" }).getByRole("button", { name, exact: true }).click();
}

test("hiện tên ngắn dưới ghim khi phóng tới mức 15", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const destination = { ...place, name: "Đại Nội Huế (Hoàng Thành)", lat: 16.47023, lng: 107.57725 };
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/places", (route) => route.fulfill({ headers, json: { data: [destination] } }));
  await page.goto("/");

  const label = page.locator(".place-marker-label");
  await expect(label).toHaveText("Đại Nội Huế");
  await expect(label).toBeHidden();
  const zoomIn = page.getByRole("button", { name: "Phóng to", exact: true });
  for (let step = 0; step < 3; step++) {
    await zoomIn.click();
  }
  await expect(label).toBeVisible();
  await page.getByRole("button", { name: "Thu nhỏ", exact: true }).click();
  await expect(label).toBeHidden();
});

test("tìm địa điểm, xem chi tiết và xử lý truy vấn rỗng kết quả", async ({ page }) => {
  await page.goto("/");
  const search = page.getByPlaceholder(/Tìm kiếm danh lam/);
  await search.fill("Thiên Mụ");
  await page.getByRole("region", { name: "Kết quả tìm kiếm địa điểm" }).getByText(place.name, { exact: true }).click();
  await expect(page.getByRole("heading", { name: place.name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quay lại danh sách" }).click();
  await search.fill("không tồn tại playwright");
  await expect(page.getByText(/Không tìm thấy địa điểm nào phù hợp/)).toBeVisible();
});

test("không đưa địa điểm ngoài Huế vào kết quả hoặc danh mục bản đồ", async ({ page }) => {
  const outside = { ...place, id: "outside-hue", name: "Cầu Rồng", lat: 16.061, lng: 108.227 };
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/places", (route) => route.fulfill({ headers, json: { data: [place, outside] } }));
  await page.route("**/api/places/search?*", (route) => route.fulfill({ headers, json: { data: [outside] } }));

  await page.goto("/");
  await page.getByRole("searchbox", { name: "Tìm địa điểm tại Huế" }).fill(outside.name);
  await expect(page.getByText("Địa điểm này nằm ngoài thành phố Huế. Bản đồ vẫn hiển thị Huế.")).toBeVisible();
  await expect(page.getByText(outside.name, { exact: true })).toHaveCount(0);
});

test("chi tiết chia đôi và báo quá xa ngay khi bấm check-in", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 16.50, longitude: 107.60 });
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = () => {
      document.documentElement.dataset.checkinRequestedGps = "true";
    };
  });
  const checkins: unknown[] = [];
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/reverse-geocode?*", (route) =>
    route.fulfill({ headers, json: { data: { address: "Huế" } } })
  );
  await page.route("**/api/checkins", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    checkins.push(route.request().postDataJSON());
    return route.fulfill({ headers, json: { data: { pointsEarned: 100 } } });
  });
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();

  await page.getByRole("searchbox", { name: "Tìm địa điểm tại Huế" }).fill("Thiên Mụ");
  await page.getByRole("region", { name: "Kết quả tìm kiếm địa điểm" }).getByText(place.name, { exact: true }).click();
  const preview = page.getByRole("region", { name: place.name, exact: true });
  const dialog = page.getByRole("dialog", { name: place.name, exact: true });
  const showDetails = preview.getByRole("button", { name: "Xem chi tiết", exact: true });
  await expect(preview.getByRole("heading", { name: place.name, exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  const desktop = testInfo.project.name === "desktop";
  if (desktop) {
    await showDetails.click();
    await expect(dialog).toBeVisible();
    const widths = await dialog.locator(":scope > div").evaluateAll((sections) =>
      sections.map((section) => section.getBoundingClientRect().width)
    );
    expect(widths).toHaveLength(2);
    expect(Math.abs(widths[0] - widths[1])).toBeLessThan(2);
  } else {
    await expect(showDetails).toHaveCount(0);
  }
  const detail = desktop ? dialog : preview;
  await expect(detail.getByText(/Cách bạn:/)).toBeVisible();

  await detail.getByRole("button", { name: /Check-in/ }).click();
  await expect(detail.getByRole("status").filter({ hasText: /Hãy đến trong bán kính 500 m/ })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-checkin-requested-gps", "true");
  expect(checkins).toEqual([]);

  await context.setGeolocation({ latitude: place.lat, longitude: place.lng });
  await expect(detail.getByText(/Đủ điều kiện check-in/)).toBeVisible();
  await detail.getByRole("button", { name: /Check-in/ }).click();
  await expect(detail.getByRole("status").filter({ hasText: /Check-in thành công/ })).toBeVisible();
  expect(checkins).toEqual([{ placeId: place.id, userLat: place.lat, userLng: place.lng }]);
  await expect(page.locator("html")).not.toHaveAttribute("data-checkin-requested-gps", "true");
  if (desktop) {
    await dialog.getByRole("button", { name: "Đóng chi tiết" }).press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(preview.getByRole("heading", { name: place.name, exact: true })).toBeVisible();
  }
});

test("báo vị trí ngoài Huế và khôi phục định vị khi quay lại Huế", async ({ page, context }) => {
  const marker = page.locator(".user-location-dot");
  const geocodeRequests: string[] = [];
  await page.route("**/api/reverse-geocode?*", (route) => {
    geocodeRequests.push(route.request().url());
    return route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: { data: { address: "Huế" } } });
  });
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 16.061, longitude: 108.227 });
  await page.goto("/");

  const notice = page.getByText("Bạn đang ở ngoài thành phố Huế, nên bản đồ vẫn hiển thị Huế.");
  await expect(notice).toBeVisible();
  await expect(marker).toHaveCount(0);
  expect(geocodeRequests).toHaveLength(0);
  await context.setGeolocation({ latitude: 16.4637, longitude: 107.5907 });
  await expect(notice).toHaveCount(0);
  await expect(marker).toBeVisible();
  await context.setGeolocation({ latitude: 16.061, longitude: 108.227 });
  await expect(notice).toBeVisible();
  await expect(marker).toHaveCount(0);
});

test("chi tiết địa điểm chỉ hiện thông tin tham quan đã được nhập", async ({ page }) => {
  const empty = {
    ...place, id: "e2e-empty-details", name: "Di tích không có thông tin thêm",
    category: "ancient", created_by: visitor.id, estimated_duration_minutes: null,
    dress_code: null, rules: [], activities: [],
  };
  const filled = {
    ...empty, id: "e2e-filled-details", name: "Di tích có thông tin thêm",
    estimated_duration_minutes: 45, dress_code: "Mang giày đế mềm",
    rules: ["Không chụp ảnh bên trong"], activities: ["Tham quan vườn"],
  };
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/places", (route) => route.fulfill({ headers, json: { data: [empty, filled] } }));
  await page.route("**/api/places/search?*", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    return route.fulfill({ headers, json: { data: [empty, filled].filter((item) => item.name === query) } });
  });

  await page.goto("/");
  const search = page.getByPlaceholder(/Tìm kiếm danh lam/);
  async function select(name: string) {
    await search.fill(name);
    await page.getByText(name, { exact: true }).filter({ visible: true }).first().click();
    const panel = page.getByRole("region", { name, exact: true });
    await expect(panel.getByRole("heading", { name, exact: true })).toBeVisible();
    return panel;
  }

  const emptyPanel = await select(empty.name);
  await expect(emptyPanel.getByText(/60 phút|trang phục|nội quy|hoạt động & trải nghiệm|vé người lớn/i)).toHaveCount(0);
  await emptyPanel.getByRole("button", { name: "Quay lại danh sách" }).click();

  const filledPanel = await select(filled.name);
  await expect(filledPanel.getByText(/45 phút/)).toBeVisible();
  for (const value of [filled.dress_code, ...filled.rules, ...filled.activities]) {
    await expect(filledPanel.getByText(value, { exact: true })).toBeVisible();
  }
});

test("menu mở các luồng công khai và yêu cầu đăng nhập cho tính năng cá nhân", async ({ page }) => {
  await page.goto("/");
  await openFeature(page, "Bảng xếp hạng");
  await expect(page.getByText("Chưa có dữ liệu xếp hạng.")).toBeVisible();
  await page.goto("/");
  await openFeature(page, "Khám phá cộng đồng");
  await expect(page.getByRole("heading", { name: "Chưa tìm thấy lịch trình phù hợp" })).toBeVisible();
  for (const [feature, prompt] of [
    ["Lịch trình của tôi", "Đăng nhập để xem lộ trình đã lưu"],
    ["Dự toán chuyến đi", "Đăng nhập để xem dự toán ngân sách"],
    ["Đóng góp địa điểm", "Đăng nhập để đóng góp địa điểm"],
    ["Tạo lịch trình với AI", "Đăng nhập để tạo lộ trình AI"],
  ]) {
    await page.goto("/");
    await openFeature(page, feature);
    await expect(page.getByRole("heading", { name: prompt })).toBeVisible();
  }
});

test("tạo lịch trình AI và xem lại trong lịch sử", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();

  await openFeature(page, "Tạo lịch trình với AI");
  const budget = page.getByPlaceholder("VD: 2000000");
  const submit = page.getByRole("button", { name: /Tạo lịch trình thông minh/ });
  await budget.fill("");
  await expect(submit).toBeDisabled();
  await budget.fill("0");
  await expect(submit).toBeDisabled();
  await budget.fill("2000000");
  const start = page.locator('input[type="date"]').nth(0);
  const end = page.locator('input[type="date"]').nth(1);
  await start.fill("2026-11-01");
  await end.fill("2026-11-15");
  await expect(submit).toBeDisabled();
  await expect(end).toHaveAttribute("max", "2026-11-14");
  await end.fill("2026-11-14");
  await expect(submit).toBeEnabled();
  const generation = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/itineraries/generate" && request.method() === "POST");
  const persistence = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/itineraries/save" && request.method() === "POST", { timeout: 10_000 });
  await submit.click();
  expect((await generation).postDataJSON()).toMatchObject({ budget: 2_000_000, groupSize: 2 });
  const saved = (await persistence).postDataJSON();
  expect(saved).toMatchObject({ isPublic: false, summary: itinerarySummary });
  expect(saved.id).toBeUndefined();
  await expect(page.getByText(itinerarySummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Private/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();
  await openFeature(page, "Lịch trình của tôi");
  await expect(page.getByRole("heading", { name: "Lịch sử Lộ trình" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Lịch trình AI \(2 người\)/ })).toBeVisible();
  await page.getByRole("button", { name: "Mở chi tiết →", exact: true }).click();
  await expect(page.getByText(itinerarySummary, { exact: true })).toBeVisible();
  const publication = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/itineraries/save" && request.method() === "POST");
  await page.getByRole("button", { name: /Private/ }).click();
  expect((await publication).postDataJSON()).toMatchObject({ id: savedItineraryId, isPublic: true });
  await expect(page.getByRole("button", { name: /Public/ })).toBeVisible();
});

test("lưu lộ trình thủ công ở chế độ riêng tư", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();
  await openFeature(page, "Lịch trình của tôi");
  await page.getByRole("button", { name: /Tạo lịch trình thủ công/ }).click();
  await page.getByPlaceholder("Tên lộ trình (tùy chọn)").fill("Lộ trình riêng");
  await page.getByRole("button", { name: /Thêm địa điểm vào ngày 1/ }).click();
  await page.getByRole("button", { name: /Thêm địa điểm riêng ngoài danh mục/ }).click();
  await page.getByPlaceholder("Tên địa điểm riêng *").fill("Điểm dừng riêng");
  await page.getByRole("button", { name: "Thêm vào ngày 1", exact: true }).click();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();

  const persistence = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/itineraries/save" && request.method() === "POST");
  await page.getByRole("button", { name: "Lưu lộ trình", exact: true }).click();
  const saved = (await persistence).postDataJSON();
  expect(saved).toMatchObject({ title: "Lộ trình riêng", isPublic: false });
  expect(saved.id).toBeUndefined();
  await expect(page.getByRole("button", { name: /Private/ })).toBeVisible();
});

test("xem lượng mưa và chuyển sang quan trắc mực nước", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mở chi tiết thời tiết và lượng mưa Vrain" }).click();
  await expect(page.getByRole("heading", { name: /Mạng lưới mưa/ })).toBeVisible();
  await expect(page.getByText("Nguy cơ ngập thấp tại Huế")).toBeVisible();
  await page.getByRole("button", { name: /Mực nước & Ngập/ }).click();
  await expect(page.getByRole("heading", { name: "Mực nước sông & Cảnh báo ngập lụt Huế" })).toBeVisible();
  await expect(page.getByText("1.23", { exact: true })).toBeVisible();
});

test("bảng thời tiết trên màn hình hẹp cuộn được và không cắt nút quay lại", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Kiểm tra bố cục mobile");
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở chi tiết thời tiết và lượng mưa Vrain" }).click();
  const dialog = page.getByRole("dialog", { name: /Mạng lưới mưa/ });
  const search = dialog.getByPlaceholder(/Tìm trạm đo mưa/);
  await search.scrollIntoViewIfNeeded();
  await expect(search).toBeInViewport({ ratio: 1 });
  await search.click({ trial: true });
  await expect(dialog.getByText("data.vrain.vn", { exact: true })).toBeInViewport({ ratio: 1 });
  const back = dialog.getByRole("button", { name: "Quay lại" });
  await expect(back).toBeInViewport({ ratio: 1 });
  await back.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Điều hướng trên điện thoại" })).toBeVisible();
});

test("hướng dẫn đặt ghim không đè lên thời tiết và danh sách địa điểm", async ({ page, isMobile }) => {
  test.skip(isMobile, "Kiểm tra bố cục desktop");
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();
  await openFeature(page, "Đóng góp địa điểm");

  const hint = page.getByText(/Hãy bấm vào bản đồ để đặt vị trí địa điểm mới/);
  await expect(hint).toBeVisible();
  const weather = page.getByRole("button", { name: "Mở chi tiết thời tiết và lượng mưa Vrain" });
  const places = page.getByRole("region", { name: /Khám phá Huế/ });
  const hintBox = (await hint.boundingBox())!;
  for (const element of [weather, places]) {
    await expect(element).toBeVisible();
    const box = (await element.boundingBox())!;
    const overlaps = hintBox.x < box.x + box.width && hintBox.x + hintBox.width > box.x &&
      hintBox.y < box.y + box.height && hintBox.y + hintBox.height > box.y;
    expect.soft(overlaps, `Hướng dẫn đặt ghim chồng lên ${await element.getAttribute("aria-label")}`).toBe(false);
  }
});

test("đăng nhập báo lỗi, cho phép thử lại và giữ phiên sau khi tải lại", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  const passwordField = page.getByPlaceholder("Tối thiểu 6 ký tự");
  await passwordField.fill("incorrect-password");
  await page.getByRole("button", { name: "Hiện mật khẩu" }).click();
  await expect(passwordField).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ẩn mật khẩu" }).click();
  await expect(passwordField).toHaveAttribute("type", "password");
  const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });
  await submit.click();
  await expect(page.getByText("Email hoặc mật khẩu không đúng.").first()).toBeVisible();
  await passwordField.fill(password);
  await submit.click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.getByRole("button", { name: `Hồ sơ ${visitor.name}` })).toBeVisible();
});

test("đăng ký tài khoản qua liên kết từ trang đăng nhập", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Đăng ký ngay" }).click();
  await expect(page).toHaveURL("/register");
  await page.getByPlaceholder("Nguyễn Văn A").fill("Khách mới Playwright");
  await page.getByPlaceholder("you@example.com").fill("new@example.test");
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Hồ sơ Khách mới Playwright" })).toBeVisible();
});

test("callback OAuth hiển thị lỗi khi thiếu phiên", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "Đăng nhập thất bại" })).toBeVisible();
});

test("điều hướng chính sách và hiển thị mã yêu cầu xóa dữ liệu", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Điều khoản/i);
  await page.locator('a[href="/privacy"]').click();
  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/riêng tư/i);
  await page.getByRole("link", { name: "Xóa dữ liệu", exact: true }).click();
  await expect(page).toHaveURL("/data-deletion");
  await page.getByPlaceholder("example@gmail.com").fill(visitor.email);
  await page.getByPlaceholder(/Cho chúng tôi biết lý do/).fill("Yêu cầu kiểm thử Playwright");
  await page.getByRole("button", { name: "Xác nhận Yêu cầu Xóa Dữ liệu" }).click();
  await expect(page.getByRole("heading", { name: "Yêu cầu đã được tiếp nhận thành công!" })).toBeVisible();
  await expect(page.getByText(/HDM-DEL-\d{6}/)).toBeVisible();
});

test("địa điểm chờ duyệt chỉ xuất hiện với người đã đóng góp", async ({ page }) => {
  const pendingName = "Địa điểm chờ duyệt Playwright";
  let contributions: unknown[] = [];
  await page.route("**/api/places/my", async (route) => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ headers, json: { data: contributions } });
  });
  await page.goto("/login");
  await page.evaluate(({ owner, pendingName }) => {
    const pending = { id: "pending-e2e", name: pendingName, category: "cafe", lat: 16.46,
      lng: 107.59, description: "", rating: 0, isLocal: true, status: "pending" };
    localStorage.setItem("huedimo_places", JSON.stringify([
      { ...pending, created_by: owner },
      { ...pending, id: "pending-legacy", name: "Địa điểm cũ thiếu chủ sở hữu" },
    ]));
  }, { owner: visitor.id, pendingName });

  contributions = [{ id: "pending-e2e", name: pendingName, category: "cafe", lat: 16.46,
    lng: 107.59, description: "", status: "pending", created_by: visitor.id }];

  const login = async (email: string, name: string) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page.getByRole("button", { name: `Hồ sơ ${name}` })).toBeVisible();
  };
  const openContributions = async (name: string) => {
    await page.getByRole("button", { name: `Hồ sơ ${name}` }).click();
    await page.getByRole("button", { name: /Địa điểm đã thêm/ }).click();
  };

  await login(visitor.email, visitor.name);
  await openContributions(visitor.name);
  await expect(page.getByText(pendingName, { exact: true }).filter({ visible: true }).last()).toBeVisible();
  await expect(page.getByText("Địa điểm cũ thiếu chủ sở hữu", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Xem$/ }).click();
  const pendingPanel = page.getByRole("region", { name: pendingName, exact: true });
  await expect(pendingPanel.getByText("Địa điểm đang chờ duyệt", { exact: true })).toBeVisible();
  await expect(pendingPanel.getByRole("button", { name: /check-in|chỉ đường|đánh giá/i })).toHaveCount(0);
  await expect(pendingPanel.getByText("Thông tin chi tiết", { exact: true })).toHaveCount(0);
  await pendingPanel.getByRole("button", { name: "Quay lại danh sách" }).click();
  await expect(pendingPanel).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByText(pendingName, { exact: true })).toHaveCount(0);

  contributions = [];
  await login("another@example.test", visitor.name);
  await openContributions(visitor.name);
  await expect(page.getByText("Chưa có địa điểm nào được thêm")).toBeVisible();
  await expect(page.getByText(pendingName, { exact: true })).toHaveCount(0);
});

test("tải ảnh đại diện trực tiếp qua URL có chữ ký", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("button", { name: `Hồ sơ ${visitor.name}` }).click();

  const presign = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/api/upload/presign" && request.method() === "POST");
  const upload = page.waitForRequest((request) =>
    new URL(request.url()).pathname === "/test-storage/upload" && request.method() === "PUT");
  await page.locator('input[type="file"]').setInputFiles({
    name: "avatar.png", mimeType: "image/png", buffer: Buffer.from("fixture"),
  });

  const metadata = await presign;
  expect(metadata.headers().authorization).toBe("Bearer fixture-access");
  expect(metadata.postDataJSON()).toEqual({
    folder: "avatars", files: [{ contentType: "image/png", size: 7 }],
  });
  const fileRequest = await upload;
  expect(fileRequest.headers().authorization).toBeUndefined();
  expect(fileRequest.postDataBuffer()?.toString()).toBe("fixture");
  await expect(page.getByPlaceholder("https://example.com/avatar.jpg")).toHaveValue(
    "http://127.0.0.1:3101/test-storage/avatar.png",
  );
});
