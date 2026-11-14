import { test as base, expect } from "@playwright/test";
import type { AdminAIConfig, AdminStats } from "../lib/api/admin";

export { expect };

export const visitor = { id: "e2e-visitor", name: "Du khách Playwright", email: "visitor@example.test", role: "user" };
export const admin = { id: "e2e-admin", name: "Quản trị Playwright", email: "admin@example.test", role: "admin" };
export const password = "fixture-password";
export const itinerarySummary = "Hành trình kiểm thử khám phá cố đô Huế.";
export const savedItineraryId = "429ab91a-30d0-4bda-8188-7de78dfe743a";
export const place = {
  id: "chua-thien-mu", name: "Chùa Thiên Mụ", address: "Kim Long, Huế",
  category: "spiritual", lat: 16.453, lng: 107.544, description: "Địa điểm kiểm thử tại Huế.",
  rating: 4.8, status: "approved",
};

const pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
const emptyPage = { items: [], pagination };
const aiConfig: AdminAIConfig = {
  model: "gemini-2.0-flash", provider: "google", temperature: 0.4, maxTokens: 4096,
  customInstruction: "",
};
const stats: AdminStats = {
  overview: { totalPlaces: 1, totalUsers: 2, totalReviews: 0, avgRating: 0 },
  categoryDistribution: [{ category: place.category, count: 1 }],
  recentPlaces: [],
};

export const test = base.extend<{ mockApi: void }>({
  mockApi: [async ({ context, baseURL }, use) => {
    const appOrigin = new URL(baseURL!).origin;
    let user = visitor;
    let config = { ...aiConfig };
    let savedItinerary: Record<string, unknown> | undefined;

    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === appOrigin) return route.continue();
      if (url.hostname === "tiles.goong.io" && url.pathname === "/assets/goong_map_web.json") {
        return route.fulfill({ json: { version: 8, sources: {}, layers: [] } });
      }
      if (url.origin !== "http://127.0.0.1:3101") return route.abort();

      const headers = {
        "access-control-allow-origin": appOrigin,
        "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      };
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const reply = (data: unknown) => route.fulfill({ headers, json: { data } });

      switch (url.pathname) {
        case "/api/auth/login":
        case "/api/auth/register": {
          const body = request.postDataJSON();
          if (body.password !== password) {
            return route.fulfill({ status: 401, headers, json: { error: { message: "Email hoặc mật khẩu không đúng." } } });
          }
          user = body.email === admin.email ? admin : { ...visitor, id: body.email === "another@example.test" ? "e2e-other" : visitor.id, name: body.name ?? visitor.name, email: body.email };
          return reply({ user, accessToken: "fixture-access", refreshToken: "fixture-refresh" });
        }
        case "/api/auth/me": return reply(user);
        case "/api/auth/profile":
          user = { ...user, ...request.postDataJSON() };
          return reply({ user });
        case "/api/upload/presign":
          return reply([{
            uploadUrl: "http://127.0.0.1:3101/test-storage/upload?token=fixture",
            publicUrl: "http://127.0.0.1:3101/test-storage/avatar.png",
          }]);
        case "/test-storage/upload":
        case "/test-storage/avatar.png":
          return route.fulfill({ status: 200, headers });
        case "/api/auth/logout": return reply({});
        case "/api/places/search":
          return reply(url.searchParams.get("q")?.toLowerCase().includes("thiên mụ") ? [place] : []);
        case "/api/places": return reply([place]);
        case "/api/places/my":
        case "/api/places/chua-thien-mu/reviews":
        case "/api/leaderboard": return reply([]);
        case "/api/itineraries/my": return reply(savedItinerary ? [savedItinerary] : []);
        case "/api/itineraries/save":
          savedItinerary = { ...request.postDataJSON(), id: savedItineraryId, userId: user.id };
          return reply(savedItinerary);
        case "/api/checkins/me": return reply({ checkins: [] });
        case "/api/itineraries/community": return reply(emptyPage);
        case "/api/weather/rainfall":
          return reply({
            source: "live", updatedAt: "2026-01-01T00:00:00Z", stations: [],
            summary: {
              totalStations: 0, rainingStations: 0, maxRainStation: null, avgRainDepth: 0,
              floodRiskLevel: "low", floodRiskLabel: "Nguy cơ ngập thấp tại Huế",
              levelCounts: { veryHeavy: 0, heavy: 0, medium: 0, light: 0, none: 0 },
            },
          });
        case "/api/water-levels":
          return reply({
            count: 0, timestamp: "2026-01-01T00:00:00Z", stations: [],
            summary: {
              totalStations: 0, riverCount: 0, floodCount: 0, floodingPoints: 0, warningPoints: 0,
              maxStation: null, perfumeriverDepth: 1.23, perfumeriverDelta: 0,
            },
          });
        case "/api/itineraries/generate": {
          const { startDate, budget, transportMode } = request.postDataJSON();
          return reply({
            summary: itinerarySummary, budget, transportMode, totalEstimatedCost: 0,
            days: [{ date: startDate, title: "Khám phá Huế", places: [{ placeId: place.id, reason: "Tham quan di sản", estimatedCost: 0 }] }],
          });
        }
        case "/api/admin/stats": return reply(stats);
        case "/api/admin/places": {
          const search = url.searchParams.get("q");
          const items = !search || place.name.toLowerCase().includes(search.toLowerCase()) ? [place] : [];
          return reply({ items, pagination: { ...pagination, total: items.length } });
        }
        case "/api/admin/users": return reply({ items: [visitor], pagination: { ...pagination, total: 1 } });
        case "/api/admin/reviews":
        case "/api/admin/itineraries":
        case "/api/admin/itinerary-comments": return reply(emptyPage);
        case "/api/admin/logs":
          return reply({ items: [], stats: { totalRequestsLogged: 0, errorCount: 0, avgLatencyMs: 0 } });
        case "/api/admin/ai-settings":
          if (request.method() === "PUT") {
            config = { ...config, ...request.postDataJSON() };
            return reply({ message: "Đã lưu cấu hình AI thành công!" });
          }
          return reply({
            config,
            defaultConfig: aiConfig,
            apiKeyStatus: { gemini: { configured: false, maskedKey: "" }, zen: { configured: false, maskedKey: "" } },
            supportedPresets: [{ id: aiConfig.model, name: "Gemini 2.0 Flash", provider: "google" }],
          });
        default:
          return route.fulfill({ status: 404, headers, json: { error: { message: `Missing E2E fixture: ${url.pathname}` } } });
      }
    });
    await use();
  }, { auto: true }],
});
