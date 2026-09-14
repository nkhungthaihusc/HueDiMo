/**
 * VFASS Hue Smart City & Disaster Monitoring API Client
 * Cung cấp xác thực tự động và truy vấn dữ liệu quan trắc ngập lụt, mực nước sông
 */

export interface OrganizationStation {
  uuid: string;
  name: string;
  address?: string;
  location?: string;
  alt?: number | null;
  area?: string;
  areaClass?: string;
  cityClass?: string;
  cityName?: string;
  code?: string;
  number?: string;
  operator?: string;
  service?: string;
  coreServices?: string[];
  lat: number;
  lng: number;
  waterStationType: "water_level" | "flood_3m" | "flood_1m5" | string;
  warningLevels?: unknown;
  reservoirLevels?: unknown;
  sensor?: unknown;
  groupName?: string;
}

export interface VWaterStatsV3 {
  sUuid: string;
  currDepth: number;
  deltaDepth: number;
  depth: number;
  prevDepth: number;
  from: string;
  to: string;
}

export interface JoinedVWaterStation {
  uuid: string;
  name: string;
  address: string;
  location?: string;
  area?: string;
  cityName?: string;
  lat: number;
  lng: number;
  waterStationType: string;
  typeLabel: string;
  operator?: string;
  alt?: number | null;
  code?: string;
  number?: string;
  currDepth: number | null;
  deltaDepth: number | null;
  depth: number | null;
  prevDepth: number | null;
  from?: string;
  to?: string;
  updatedAt?: string;
  isFlooding: boolean;
  isWarning: boolean;
}

interface VfassSession {
  sid: string;
  expiresAt: number;
}

let cachedSession: VfassSession | null = null;

const VFASS_BASE_URL = "https://hue.vfass.vn";
const ORG_UUID = "a2222302-d07a-4503-93da-e35685565be3";
const GA_COOKIE_PREFIX =
  "_ga=GA1.1.922741054.1789090919;_ga_P14ZMM778Z=GS2.1.s1789090918$o1$g1$t1789091689$j38$l0$h0";

/**
 * Đăng nhập vào hệ thống VFASS Huế và lấy phiên làm việc (sid)
 */
export async function getVfassSession(): Promise<string> {
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
    expiresAt: now + 12 * 3600 * 1000, // Cache 12 giờ
  };

  return sid;
}

/**
 * Gọi API nội bộ của VFASS Huế với Cookie & Headers xác thực đầy đủ
 */
export async function fetchVfass<T>(path: string): Promise<T> {
  let sid = await getVfassSession();

  const doFetch = async (currentSid: string) => {
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
      next: { revalidate: 60 }, // Cache 60s
    });
  };

  let res = await doFetch(sid);

  // Nếu token hết hạn (401), thử login lại 1 lần
  if (res.status === 401) {
    cachedSession = null;
    sid = await getVfassSession();
    res = await doFetch(sid);
  }

  if (!res.ok) {
    throw new Error(`VFASS request to ${path} failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

/**
 * Lấy toàn bộ thông tin các trạm quan trắc từ API:
 * /api/private/v1/organizations/stations
 * và kết hợp với dữ liệu đo đạc chi tiết từ API:
 * /api/vwater/private/v3/stats/summary
 * theo uuid === sUuid
 */
export async function getJoinedWaterStations(): Promise<JoinedVWaterStation[]> {
  const [stations, statsSummary] = await Promise.all([
    fetchVfass<OrganizationStation[]>("/api/private/v1/organizations/stations"),
    fetchVfass<VWaterStatsV3[]>("/api/vwater/private/v3/stats/summary"),
  ]);

  const statsMap = new Map<string, VWaterStatsV3>();
  if (Array.isArray(statsSummary)) {
    for (const stat of statsSummary) {
      if (stat?.sUuid) {
        statsMap.set(stat.sUuid, stat);
      }
    }
  }

  if (!Array.isArray(stations)) {
    return [];
  }

  return stations.map((station) => {
    const stat = statsMap.get(station.uuid);
    const rawCurr = stat?.currDepth;
    const rawDelta = stat?.deltaDepth;

    const currDepth =
      typeof rawCurr === "number" && rawCurr !== -999 && rawCurr > -500
        ? Math.round(rawCurr * 100) / 100
        : null;

    const depth =
      typeof stat?.depth === "number" && stat.depth !== -999 && stat.depth > -500
        ? Math.round(stat.depth * 100) / 100
        : null;

    const prevDepth =
      typeof stat?.prevDepth === "number" && stat.prevDepth !== -999 && stat.prevDepth > -500
        ? Math.round(stat.prevDepth * 100) / 100
        : null;

    let deltaDepth =
      typeof rawDelta === "number" && Math.abs(rawDelta) < 50
        ? Math.round(rawDelta * 100) / 100
        : null;

    // Nếu rawDelta bị lỗi do -999 nhưng có đủ currDepth và prevDepth hợp lệ
    if (deltaDepth === null && currDepth !== null && prevDepth !== null) {
      deltaDepth = Math.round((currDepth - prevDepth) * 100) / 100;
    }

    const isFloodType =
      station.waterStationType === "flood_3m" ||
      station.waterStationType === "flood_1m5";

    const typeLabel =
      station.waterStationType === "water_level"
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
  });
}
