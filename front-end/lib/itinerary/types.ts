import type { CategoryId, Place } from "@/lib/types";

export type TransportMode = "motorbike" | "car" | "bicycle" | "walking";

export interface TransportOption {
  id: TransportMode;
  label: string;
  emoji: string;
  speedKmh: number;
  description: string;
}

export const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: "motorbike",
    label: "Xe máy",
    emoji: "🛵",
    speedKmh: 30,
    description: "Linh hoạt, luồn lách ngõ phố (~30 km/h)",
  },
  {
    id: "car",
    label: "Ô tô / Taxi",
    emoji: "🚗",
    speedKmh: 35,
    description: "Mát mẻ, tiện cho gia đình/nhóm (~35 km/h)",
  },
  {
    id: "bicycle",
    label: "Xe đạp",
    emoji: "🚲",
    speedKmh: 14,
    description: "Thong thả ngắm cảnh sông Hương (~14 km/h)",
  },
  {
    id: "walking",
    label: "Đi bộ",
    emoji: "🚶",
    speedKmh: 4.5,
    description: "Dạo quanh Kinh thành, phố đi bộ (~4.5 km/h)",
  },
];

export function getTransportOption(mode?: TransportMode): TransportOption {
  return TRANSPORT_OPTIONS.find((t) => t.id === mode) ?? TRANSPORT_OPTIONS[0];
}

/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ (Haversine Formula) theo km.
 * Nhân hệ số uốn lượn đường sá thực tế trung bình tại Huế ~1.35.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  detourFactor = 1.35,
): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straight = R * c;
  return Math.round(straight * detourFactor * 10) / 10;
}

/**
 * Tính thời gian di chuyển (phút) dựa vào khoảng cách và phương tiện.
 */
export function calculateTravelTimeMinutes(
  distanceKm: number,
  mode: TransportMode = "motorbike",
): number {
  if (distanceKm <= 0.05) return 2;
  const opt = getTransportOption(mode);
  const hours = distanceKm / opt.speedKmh;
  const minutes = Math.round(hours * 60);
  return Math.max(2, minutes);
}

/**
 * Định dạng thời gian di chuyển sang tiếng Việt dễ đọc.
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `~${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} giờ` : `~${h} giờ ${m} phút`;
}

export interface ItineraryRequest {
  startDate: string;
  endDate: string;
  preferences: CategoryId[];
  budget: number;
  currentLocation: string;
  startPlaceId: string | null;
  endPlaceId: string | null;
  transportMode?: TransportMode;
  groupSize?: number;
  notes?: string;
  places: Place[];
}

export interface ItineraryPlace {
  placeId: string;
  reason: string;
  estimatedCost: number;
  customName?: string;
  note?: string;
}

export interface ItineraryDay {
  date: string;
  title: string;
  places: ItineraryPlace[];
}

export interface Itinerary {
  id?: string;
  summary: string;
  totalEstimatedCost: number;
  budget?: number;
  transportMode?: TransportMode;
  groupSize?: number;
  notes?: string;
  isAiGenerated?: boolean;
  createdAt?: string;
  days: ItineraryDay[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function itineraryTotal(itinerary: Itinerary): number {
  return itinerary.days.reduce(
    (acc, d) => acc + d.places.reduce((s, p) => s + p.estimatedCost, 0),
    0,
  );
}

export function itineraryDates(itinerary: Itinerary): { start: string; end: string } {
  const dates = itinerary.days.map((d) => d.date).filter(Boolean).sort();
  return { start: dates[0] ?? "", end: dates[dates.length - 1] ?? "" };
}

export function parseItinerary(raw: unknown): Itinerary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const daysRaw = Array.isArray(obj.days) ? obj.days : [];

  const days: ItineraryDay[] = [];
  const seen = new Set<string>();
  for (const dayRaw of daysRaw) {
    if (typeof dayRaw !== "object" || dayRaw === null) continue;
    const day = dayRaw as Record<string, unknown>;
    const date = typeof day.date === "string" && DATE_RE.test(day.date) ? day.date : "";
    const title = typeof day.title === "string" ? day.title : "";
    const placesRaw = Array.isArray(day.places) ? day.places : [];
    const places: ItineraryPlace[] = [];
    for (const placeRaw of placesRaw) {
      if (typeof placeRaw !== "object" || placeRaw === null) continue;
      const p = placeRaw as Record<string, unknown>;
      if (typeof p.placeId !== "string") continue;
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      places.push({
        placeId: p.placeId,
        reason: typeof p.reason === "string" ? p.reason : "",
        estimatedCost:
          typeof p.estimatedCost === "number" && Number.isFinite(p.estimatedCost)
            ? Math.max(0, p.estimatedCost)
            : 0,
        customName: typeof p.customName === "string" ? p.customName : undefined,
        note: typeof p.note === "string" ? p.note : undefined,
      });
    }
    if (!date || places.length === 0) continue;
    days.push({ date, title, places });
  }

  if (days.length === 0) return null;

  const totalEstimatedCost = days.reduce(
    (acc, d) => acc + d.places.reduce((s, p) => s + p.estimatedCost, 0),
    0,
  );

  const rawBudget = obj.budget;
  const budget =
    typeof rawBudget === "number" && Number.isFinite(rawBudget) && rawBudget > 0
      ? rawBudget
      : undefined;

  const rawTransport = obj.transportMode;
  const transportMode: TransportMode | undefined =
    rawTransport === "motorbike" ||
    rawTransport === "car" ||
    rawTransport === "bicycle" ||
    rawTransport === "walking"
      ? rawTransport
      : undefined;

  const groupSize =
    typeof obj.groupSize === "number" && Number.isFinite(obj.groupSize) && obj.groupSize > 0
      ? obj.groupSize
      : undefined;

  const notes = typeof obj.notes === "string" ? obj.notes : undefined;
  const isAiGenerated = typeof obj.isAiGenerated === "boolean" ? obj.isAiGenerated : undefined;

  return { summary, totalEstimatedCost, budget, transportMode, groupSize, notes, isAiGenerated, days };
}