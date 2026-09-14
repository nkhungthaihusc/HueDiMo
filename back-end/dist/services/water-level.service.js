"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaterLevelService = void 0;
let cachedSession = null;
let cachedResult = null;
const CACHE_RESULT_TTL_MS = 60 * 1000; // Cache kết quả 60s
const VFASS_BASE_URL = "https://hue.vfass.vn";
const ORG_UUID = "a2222302-d07a-4503-93da-e35685565be3";
const GA_COOKIE_PREFIX = "_ga=GA1.1.922741054.1789090919;_ga_P14ZMM778Z=GS2.1.s1789090918$o1$g1$t1789091689$j38$l0$h0";
class WaterLevelService {
    /**
     * Đăng nhập vào hệ thống quan trắc và lấy phiên làm việc (sid)
     */
    static async getSession() {
        const now = Date.now();
        if (cachedSession && cachedSession.expiresAt > now) {
            return cachedSession.sid;
        }
        const res = await fetch(`${VFASS_BASE_URL}/api/public/v2/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "PostmanRuntime/2.5.1",
                "Accept": "*/*",
                "Accept-Language": "en-US,en-GB;q=0.9,en;q=0.8,vi;q=0.7",
                "Referer": `${VFASS_BASE_URL}/login`,
                "x-Org-Uuid": ORG_UUID,
            },
            body: JSON.stringify({
                username: "thuathienhue",
                password: "123456",
                orgUuid: ORG_UUID,
                fromMobile: false,
            }),
        });
        if (!res.ok) {
            throw new Error(`VFASS login failed: ${res.status} ${res.statusText}`);
        }
        const setCookie = res.headers.get("set-cookie") || "";
        const match = setCookie.match(/sid=([^;]+)/);
        if (!match) {
            throw new Error("No sid cookie found in login response");
        }
        const sid = match[1];
        cachedSession = {
            sid,
            expiresAt: now + 12 * 3600 * 1000, // Cache session 12 giờ
        };
        return sid;
    }
    /**
     * Gọi API nội bộ với Cookie & Headers xác thực đầy đủ
     */
    static async fetchVfass(path) {
        let sid = await this.getSession();
        const doFetch = async (currentSid) => {
            const cookie = `${GA_COOKIE_PREFIX}; sid=${currentSid}`;
            return fetch(`${VFASS_BASE_URL}${path}`, {
                method: "GET",
                headers: {
                    "User-Agent": "PostmanRuntime/2.5.1",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en-GB;q=0.9,en;q=0.8,vi;q=0.7",
                    "Referer": `${VFASS_BASE_URL}/main/dashboard`,
                    "x-org-uuid": ORG_UUID,
                    "Cookie": cookie,
                },
            });
        };
        let res = await doFetch(sid);
        // Nếu token hết hạn (401), thử login lại 1 lần
        if (res.status === 401) {
            cachedSession = null;
            sid = await this.getSession();
            res = await doFetch(sid);
        }
        if (!res.ok) {
            throw new Error(`Upstream request to ${path} failed with status ${res.status}`);
        }
        return (await res.json());
    }
    /**
     * Lấy danh sách trạm quan trắc mực nước & tính toán summary
     */
    static async getWaterLevels() {
        const now = Date.now();
        if (cachedResult && now - cachedResult.timestamp < CACHE_RESULT_TTL_MS) {
            return cachedResult.data;
        }
        const [stations, statsSummary] = await Promise.all([
            this.fetchVfass("/api/private/v1/organizations/stations"),
            this.fetchVfass("/api/vwater/private/v3/stats/summary"),
        ]);
        const statsMap = new Map();
        if (Array.isArray(statsSummary)) {
            for (const stat of statsSummary) {
                if (stat?.sUuid) {
                    statsMap.set(stat.sUuid, stat);
                }
            }
        }
        const joinedStations = Array.isArray(stations)
            ? stations.map((station) => {
                const stat = statsMap.get(station.uuid);
                const rawCurr = stat?.currDepth;
                const rawDelta = stat?.deltaDepth;
                const currDepth = typeof rawCurr === "number" && rawCurr !== -999 && rawCurr > -500
                    ? Math.round(rawCurr * 100) / 100
                    : null;
                const depth = typeof stat?.depth === "number" && stat.depth !== -999 && stat.depth > -500
                    ? Math.round(stat.depth * 100) / 100
                    : null;
                const prevDepth = typeof stat?.prevDepth === "number" && stat.prevDepth !== -999 && stat.prevDepth > -500
                    ? Math.round(stat.prevDepth * 100) / 100
                    : null;
                let deltaDepth = typeof rawDelta === "number" && Math.abs(rawDelta) < 50
                    ? Math.round(rawDelta * 100) / 100
                    : null;
                if (deltaDepth === null && currDepth !== null && prevDepth !== null) {
                    deltaDepth = Math.round((currDepth - prevDepth) * 100) / 100;
                }
                const isFloodType = station.waterStationType === "flood_3m" ||
                    station.waterStationType === "flood_1m5";
                const typeLabel = station.waterStationType === "water_level"
                    ? "Mực nước sông"
                    : station.waterStationType === "flood_3m"
                        ? "Cảnh báo ngập (3m)"
                        : station.waterStationType === "flood_1m5"
                            ? "Cảnh báo ngập (1.5m)"
                            : "Trạm quan trắc nước";
                return {
                    uuid: station.uuid,
                    name: station.name,
                    address: station.address || station.location || "Thành phố Huế",
                    location: station.location,
                    area: station.area,
                    cityName: station.cityName || "Thành phố Huế",
                    lat: station.lat,
                    lng: station.lng,
                    waterStationType: station.waterStationType,
                    typeLabel,
                    operator: station.operator,
                    alt: station.alt,
                    code: station.code,
                    number: station.number,
                    currDepth,
                    deltaDepth,
                    depth,
                    prevDepth,
                    from: stat?.from,
                    to: stat?.to,
                    updatedAt: stat?.to || stat?.from,
                    isFlooding: isFloodType && typeof currDepth === "number" && currDepth > 0,
                    isWarning: typeof currDepth === "number" && currDepth >= 0.5,
                };
            })
            : [];
        // Tính toán thống kê nhanh
        const riverStations = joinedStations.filter((s) => s.waterStationType === "water_level");
        const floodStations = joinedStations.filter((s) => s.waterStationType === "flood_3m" || s.waterStationType === "flood_1m5");
        const floodingCount = floodStations.filter((s) => s.isFlooding).length;
        const warningCount = joinedStations.filter((s) => s.isWarning).length;
        let maxStation = null;
        let maxDepth = -Infinity;
        for (const s of joinedStations) {
            if (typeof s.currDepth === "number" && s.currDepth > maxDepth) {
                maxDepth = s.currDepth;
                maxStation = s;
            }
        }
        const perfumeriverStation = joinedStations.find((s) => s.name.includes("Dã Viên")) ||
            joinedStations.find((s) => s.name.includes("Sông Hương")) ||
            null;
        const result = {
            count: joinedStations.length,
            timestamp: new Date().toISOString(),
            summary: {
                totalStations: joinedStations.length,
                riverCount: riverStations.length,
                floodCount: floodStations.length,
                floodingPoints: floodingCount,
                warningPoints: warningCount,
                maxStation,
                perfumeriverStation,
                perfumeriverDepth: perfumeriverStation?.currDepth ?? null,
                perfumeriverDelta: perfumeriverStation?.deltaDepth ?? null,
            },
            stations: joinedStations,
        };
        cachedResult = {
            data: result,
            timestamp: now,
        };
        return result;
    }
}
exports.WaterLevelService = WaterLevelService;
