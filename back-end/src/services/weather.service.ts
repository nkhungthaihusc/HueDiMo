import fallbackData from "../data/vrain-weather-fallback.json";

export interface VrainArea {
  id: number;
  name: string;
  type: string;
  codeName: string;
}

export interface VrainCity {
  id: number;
  name: string;
  type: string;
  codeName: string;
}

export interface VrainStationDetail {
  address: string;
  area: VrainArea;
  city: VrainCity;
  lat: number;
  lng: number;
  name: string;
  uuid: string;
}

export interface VrainStation {
  color: string;
  level: string;
  station: VrainStationDetail;
  sumDepth: number;
}

export interface VrainSummary {
  totalStations: number;
  rainingStations: number;
  maxRainStation: {
    name: string;
    address: string;
    sumDepth: number;
    level: string;
    color: string;
    areaName: string;
  } | null;
  avgRainDepth: number;
  floodRiskLevel: "low" | "medium" | "high" | "severe";
  floodRiskLabel: string;
  levelCounts: {
    veryHeavy: number;
    heavy: number;
    medium: number;
    light: number;
    none: number;
  };
}

export interface WeatherRainfallResult {
  source: "live" | "fallback";
  updatedAt: string;
  summary: VrainSummary;
  stations: VrainStation[];
  error?: string;
}

const VRAIN_API_URL = "https://data.vrain.vn/public/current/31.json";
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

interface CacheEntry {
  data: WeatherRainfallResult;
  timestamp: number;
}

let cachedWeather: CacheEntry | null = null;

function computeSummary(stations: VrainStation[]): VrainSummary {
  const totalStations = stations.length;
  let rainingStations = 0;
  let sumAllDepths = 0;
  let maxStation: VrainStation | null = null;

  const levelCounts = {
    veryHeavy: 0,
    heavy: 0,
    medium: 0,
    light: 0,
    none: 0,
  };

  for (const s of stations) {
    const rawDepth = typeof s.sumDepth === "number" ? s.sumDepth : 0;
    const depth = Math.round(rawDepth * 10) / 10;
    s.sumDepth = depth;
    sumAllDepths += depth;

    if (depth > 0) {
      rainingStations++;
    }

    if (!maxStation || depth > (maxStation.sumDepth ?? 0)) {
      maxStation = s;
    }

    if (depth >= 100 || s.level === "Mưa rất to") {
      levelCounts.veryHeavy++;
    } else if (depth >= 50 || s.level === "Mưa to") {
      levelCounts.heavy++;
    } else if (depth >= 25 || s.level === "Mưa vừa") {
      levelCounts.medium++;
    } else if (depth > 0 || s.level === "Mưa nhỏ") {
      levelCounts.light++;
    } else {
      levelCounts.none++;
    }
  }

  const avgRainDepth = totalStations > 0 ? Number((sumAllDepths / totalStations).toFixed(1)) : 0;
  const maxDepth = maxStation?.sumDepth ?? 0;

  let floodRiskLevel: VrainSummary["floodRiskLevel"] = "low";
  let floodRiskLabel = "An toàn - Điều kiện thời tiết ổn định, thuận lợi di chuyển";

  if (maxDepth >= 100 || levelCounts.veryHeavy >= 3) {
    floodRiskLevel = "severe";
    floodRiskLabel = "Báo động đỏ - Mưa rất lớn, nguy cơ cao ngập lụt diện rộng & lũ quét vùng núi";
  } else if (maxDepth >= 50 || levelCounts.heavy >= 5) {
    floodRiskLevel = "high";
    floodRiskLabel = "Cảnh báo - Mưa to kéo dài, đề phòng ngập úng cục bộ tại các điểm trũng thấp Cố Đô";
  } else if (maxDepth >= 25 || rainingStations > totalStations / 2) {
    floodRiskLevel = "medium";
    floodRiskLabel = "Lưu ý - Có mưa vừa rải rác trên diện rộng, đường trơn trượt khi tham quan ngoài trời";
  }

  return {
    totalStations,
    rainingStations,
    maxRainStation: maxStation
      ? {
          name: maxStation.station.name,
          address: maxStation.station.address,
          sumDepth: Math.round((maxStation.sumDepth ?? 0) * 10) / 10,
          level: maxStation.level,
          color: maxStation.color,
          areaName: maxStation.station.area?.name ?? "",
        }
      : null,
    avgRainDepth,
    floodRiskLevel,
    floodRiskLabel,
    levelCounts,
  };
}

function isValidStation(item: unknown): item is VrainStation {
  if (!item || typeof item !== "object") return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.sumDepth === "number" &&
    typeof s.color === "string" &&
    typeof s.level === "string" &&
    typeof s.station === "object" &&
    s.station !== null
  );
}

export class WeatherService {
  public static async getRainfall(): Promise<WeatherRainfallResult> {
    const now = Date.now();
    if (cachedWeather && now - cachedWeather.timestamp < CACHE_TTL_MS) {
      return cachedWeather.data;
    }

    let stations: VrainStation[] = [];
    let isLive = false;
    let errorMsg: string | undefined;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(VRAIN_API_URL, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "HueDiMo-App/1.0",
        },
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && isValidStation(data[0])) {
          stations = data as VrainStation[];
          isLive = true;
        } else {
          throw new Error("Invalid schema received from Vrain API");
        }
      } else {
        throw new Error(`Vrain HTTP error status: ${res.status}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown fetch error";
      errorMsg = message;
      console.warn(`[WeatherService fallback]: ${message}. Using bundled fallback dataset.`);
      stations = fallbackData as VrainStation[];
      isLive = false;
    }

    const sortedStations = [...stations].sort((a, b) => (b.sumDepth ?? 0) - (a.sumDepth ?? 0));
    const summary = computeSummary(sortedStations);

    const result: WeatherRainfallResult = {
      source: isLive ? "live" : "fallback",
      updatedAt: new Date().toISOString(),
      summary,
      stations: sortedStations,
      ...(errorMsg ? { error: errorMsg } : {}),
    };

    cachedWeather = {
      data: result,
      timestamp: now,
    };

    return result;
  }
}
