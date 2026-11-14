import { test, expect, visitor, password, savedItineraryId, place } from "./fixtures";

test("dự toán tải lịch trình từ máy chủ và lưu ngân sách", async ({ page }) => {
  const itinerary = {
    id: savedItineraryId, title: "Lộ trình có trên máy chủ", userId: visitor.id,
    start_date: "2026-11-14T00:00:00.000Z", end_date: "2026-11-15T00:00:00.000Z", isPublic: true,
    currentLocation: "Huế", preferences: ["cultural"], totalEstimatedCost: 350000,
    days: [{ date: "2026-11-14", title: "Huế", places: [{ placeId: place.id, estimatedCost: 350000 }] }],
  };
  let budget = 100000;
  await page.route("**/api/itineraries/**", async (route) => {
    const endpoint = new URL(route.request().url()).pathname.split("/").at(-1);
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (endpoint === "save") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ id: savedItineraryId, budget: 50000, isPublic: true,
        startDate: "2026-11-14", endDate: "2026-11-15", currentLocation: "Huế", preferences: ["cultural"] });
      budget = body.budget;
    }
    const entry = { ...itinerary, budget };
    return route.fulfill({ headers, json: { data: endpoint === "my" ? [entry] : entry } });
  });
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(visitor.email);
  await page.getByPlaceholder("Tối thiểu 6 ký tự").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

  const openBudget = async () => {
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    await page.getByRole("navigation", { name: "Tất cả chức năng" })
      .getByRole("button", { name: "Dự toán chuyến đi", exact: true }).click();
  };
  await openBudget();
  await expect(page.getByRole("heading", { name: itinerary.title })).toBeVisible();
  await page.getByRole("button", { name: /Chỉnh ngân sách/ }).click();
  await page.getByRole("textbox", { name: "Ngân sách (đ)", exact: true }).fill("50000");
  await expect(page.getByRole("textbox", { name: "Ngân sách (đ)", exact: true })).toHaveValue("50.000");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByText("Đã lưu ngân sách.", { exact: true })).toBeVisible();
  await page.reload();
  await openBudget();
  await page.getByRole("button", { name: /Chỉnh ngân sách/ }).click();
  await expect(page.getByRole("textbox", { name: "Ngân sách (đ)", exact: true })).toHaveValue("50.000");
});
