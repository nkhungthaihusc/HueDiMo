import { readFileSync } from "node:fs";
import path from "node:path";
import { wardContains, type HueWards } from "../lib/data/hue-wards";
import { clusterPlaces, layoutMarkerOffsets } from "../lib/map/clusters";
import { test, expect, place } from "./fixtures";

const wards: HueWards = JSON.parse(readFileSync(path.join(__dirname, "../public/data/hue-wards.geojson"), "utf8"));
const citadel = { ...place, id: "dai-noi", name: "Đại Nội Huế", lat: 16.47023, lng: 107.57725, category: "ancient" };
const gate = { ...citadel, id: "ngo-mon", name: "Ngọ Môn", lat: 16.4699 };

test("dữ liệu có 40 xã phường và phân vùng theo tọa độ", () => {
  expect(wards.features).toHaveLength(40);
  expect(new Set(wards.features.map((ward) => ward.properties.code)).size).toBe(40);
  expect(wards.features.filter((ward) => ward.properties.name.startsWith("Phường "))).toHaveLength(21);
  expect(wards.features.filter((ward) => ward.properties.name.startsWith("Xã "))).toHaveLength(19);
  expect(wards.features.filter((ward) => wardContains(ward, citadel)).map((ward) => ward.properties.code)).toEqual(["19753"]);
  expect(wards.features.filter((ward) => wardContains(ward, place)).map((ward) => ward.properties.code)).toEqual(["19774"]);
  expect(wards.features.some((ward) => wardContains(ward, { lat: 16.061, lng: 108.227 }))).toBe(false);
});

test("phần trống bên phải cho phép thao tác bản đồ sau khi thu gọn danh sách", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const picker = page.getByRole("combobox", { name: "Chọn xã hoặc phường" });
  await picker.selectOption("19774");
  const closeNotice = page.getByRole("button", { name: "Đóng thông báo", exact: true });
  if (await closeNotice.count()) await closeNotice.click();
  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "Thu gọn danh sách", exact: true }).click();
    await expect(page.getByRole("button", { name: "Mở rộng danh sách", exact: true })).toBeVisible();
  }
  const viewport = page.viewportSize()!;
  const assertMapReceivesPointer = async () => {
    for (const fraction of [0.45, 0.6, 0.75]) {
      const hitMap = await page.evaluate(({ x, y }) =>
        Boolean(document.elementFromPoint(x, y)?.closest(".maplibregl-map")),
        { x: viewport.width - 80, y: viewport.height * fraction }
      );
      expect(hitMap).toBe(true);
    }
  };
  await assertMapReceivesPointer();
  const marker = page.locator(".place-marker-wrap").first();
  await expect(marker).toBeAttached();
  const originalTransform = await marker.evaluate((element) => element.style.transform);
  await page.mouse.move(viewport.width - 80, viewport.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(viewport.width - 180, viewport.height * 0.55, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => marker.evaluate((element) => element.style.transform)).not.toBe(originalTransform);
  await picker.selectOption("19753");
  await assertMapReceivesPointer();
  if (testInfo.project.name === "desktop") {
    await page.getByRole("button", { name: "Mở rộng danh sách", exact: true }).click();
    await expect(page.getByPlaceholder("Tìm Đại Nội, lăng tẩm, chùa, quán ăn...")).toBeVisible();
  }
});

test("cụm giữ đủ điểm, tách điểm đang chọn và mở từng điểm ở zoom 15", () => {
  const points = [citadel, gate, place];
  const overview = clusterPlaces(points, 12);
  expect(overview.map((cluster) => cluster.places.length).sort()).toEqual([1, 2]);
  expect(overview.flatMap((cluster) => cluster.places.map((point) => point.id)).sort()).toEqual(points.map((point) => point.id).sort());
  expect(clusterPlaces(points, 15)).toHaveLength(3);
  expect(clusterPlaces(points, 12, new Set([gate.id]))).toHaveLength(3);
});

test("bản ghi trùng mã chỉ đếm một lần và các điểm cùng tọa độ có ghim riêng", () => {
  const second = { ...citadel, id: "second-place" };
  expect(clusterPlaces([citadel, citadel], 12)[0].places).toHaveLength(1);
  expect(clusterPlaces([citadel, second], 12)[0].places).toHaveLength(2);
  const offsets = layoutMarkerOffsets([citadel, second], 15);
  expect(offsets.get(citadel.id)).not.toEqual(offsets.get(second.id));
  const crowded = Array.from({ length: 20 }, (_, index) => ({ ...citadel, id: String(index) }));
  expect(new Set([...layoutMarkerOffsets(crowded, 15).values()].map((offset) => `${offset.x},${offset.y}`)).size).toBe(20);
});

test("cụm cùng tọa độ tách thành hai ghim và bấm được cả nhãn tên", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const abbey = { ...place, id: "dan-vien-thien-an", name: "Đan viện Thiên An", lat: 16.4065, lng: 107.5555 };
  const hill = { ...abbey, id: "phong-nha-nho", name: "Đồi Thiên An & Hồ Thủy Tiên" };
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/places", (route) => route.fulfill({ headers, json: { data: [abbey, abbey, hill] } }));
  await page.goto("/");
  await page.getByRole("combobox", { name: "Chọn xã hoặc phường" }).selectOption("19774");
  const closeNotice = page.getByRole("button", { name: "Đóng thông báo", exact: true });
  if (await closeNotice.count()) await closeNotice.click();
  const cluster = page.getByRole("button", { name: "Phóng to cụm 2 địa điểm" });
  await expect(cluster).toBeVisible();
  await expect(cluster).toHaveAttribute("title", `${abbey.name}\n${hill.name}`);
  for (let step = 0; step < 4 && await cluster.count(); step++) await cluster.click();
  await expect(page.locator(".place-cluster")).toHaveCount(0);
  await expect(page.locator(".place-marker-wrap")).toHaveCount(2);
  const first = page.getByRole("button", { name: abbey.name, exact: true });
  const second = page.getByRole("button", { name: hill.name, exact: true });
  const a = (await first.boundingBox())!;
  const b = (await second.boundingBox())!;
  expect(Math.abs(a.x - b.x) >= 38 || Math.abs(a.y - b.y) >= 38).toBe(true);
  await second.locator(".place-marker-label").hover();
  await second.locator(".place-marker-label").click();
  await expect(page.getByRole("heading", { name: hill.name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
  if (testInfo.project.name === "mobile") await page.locator(".home-panel-handle").click();
  await page.getByRole("button", { name: "Phóng to", exact: true }).click();
  await first.click();
  await expect(page.getByRole("heading", { name: abbey.name, exact: true })).toBeVisible();
});

test("chọn xã phường lọc ghim, cập nhật cụm và trở lại toàn Huế", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const headers = { "access-control-allow-origin": "*" };
  await page.route("**/api/places", (route) => route.fulfill({ headers, json: { data: [citadel, gate, place] } }));
  await page.goto("/");
  const picker = page.getByRole("combobox", { name: "Chọn xã hoặc phường" });
  await expect(picker).toBeEnabled();
  await expect(picker.locator("option")).toHaveCount(41);
  await expect(page.getByRole("button", { name: "Phóng to cụm 2 địa điểm" })).toBeVisible();

  await picker.selectOption("19774");
  await expect(page.getByRole("status").filter({ hasText: /^1 điểm$/ })).toBeVisible();
  await expect(page.locator(".place-marker-wrap")).toHaveCount(1);
  await expect(page.locator(".place-marker-label")).toHaveText(place.name);
  await expect(page.locator(".place-cluster")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Tìm địa điểm tại Huế" }).fill("Đại Nội");
  await expect(page.getByText(/Đang tìm trong Phường Kim Long/)).toBeVisible();
  await expect(picker).toHaveValue("19774");

  await picker.selectOption("19918");
  await expect(page.getByRole("status").filter({ hasText: /^0 điểm$/ })).toBeVisible();
  await expect(page.locator(".place-marker-wrap, .place-cluster")).toHaveCount(0);

  await picker.selectOption("");
  const cluster = page.locator(".place-cluster").first();
  await expect(cluster).toBeVisible();
  for (let step = 0; step < 4 && await cluster.count(); step++) {
    await cluster.click();
  }
  await expect(page.locator(".place-cluster")).toHaveCount(0);
  await expect(page.locator(".place-marker-wrap")).toHaveCount(3);
  await expect(page.locator(".place-marker-label").filter({ hasText: citadel.name })).toBeVisible();
});
