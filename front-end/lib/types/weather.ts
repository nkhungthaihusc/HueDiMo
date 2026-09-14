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
  level: string; // "Mưa rất to" | "Mưa to" | "Mưa vừa" | "Mưa nhỏ" | "Không mưa"
  station: VrainStationDetail;
  sumDepth: number; // Lượng mưa tính bằng mm
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
    veryHeavy: number; // Mưa rất to (>100mm)
    heavy: number;     // Mưa to (50-100mm)
    medium: number;    // Mưa vừa (25-50mm)
    light: number;     // Mưa nhỏ (0.1-25mm)
    none: number;      // Không mưa (0mm)
  };
}

export interface VrainApiResponse {
  success: boolean;
  source: "live" | "fallback";
  updatedAt: string;
  summary: VrainSummary;
  stations: VrainStation[];
  error?: string;
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

export interface VWaterSummary {
  totalStations: number;
  riverCount: number;
  floodCount: number;
  floodingPoints: number;
  warningPoints: number;
  maxStation: JoinedVWaterStation | null;
  perfumeriverStation?: JoinedVWaterStation | null;
  perfumeriverDepth: number | null;
  perfumeriverDelta: number | null;
}

export interface VWaterApiResponse {
  success: boolean;
  count: number;
  timestamp: string;
  summary: VWaterSummary;
  stations: JoinedVWaterStation[];
  error?: string;
}

export interface ExtendedWeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    is_day: number;
    precipitation?: number;
    wind_speed_10m?: number;
    uv_index?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
  };
}
