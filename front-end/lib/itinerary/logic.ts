import type { Itinerary } from "@/lib/itinerary/types";
import { itineraryTotal } from "@/lib/itinerary/types";

const ITINERARIES_KEY = "huedimo_itineraries";

export interface SavedItinerary extends Itinerary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export function defaultTitle(itinerary: Itinerary): string {
  const dates = itinerary.days.map((d) => d.date).filter(Boolean).sort();
  const prefix = itinerary.isAiGenerated ? "✨ Lịch trình AI" : "Lộ trình";
  const groupText = itinerary.groupSize ? ` (${itinerary.groupSize} người)` : "";
  if (dates.length === 0) return `${prefix}${groupText} của tôi`;
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN");
  return dates.length === 1
    ? `${prefix}${groupText} ${fmt(dates[0])}`
    : `${prefix}${groupText} ${fmt(dates[0])} → ${fmt(dates[dates.length - 1])}`;
}

function normalize(raw: unknown): SavedItinerary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry, i) => {
    if (typeof entry !== "object" || entry === null) return [];
    const e = entry as Record<string, unknown>;
    if (!Array.isArray(e.days)) return [];
    const it = e as unknown as Itinerary;
    if (it.days.every((d) => d.places.length === 0)) return [];
    return [
      {
        ...it,
        totalEstimatedCost: typeof e.totalEstimatedCost === "number" ? e.totalEstimatedCost : 0,
        id: typeof e.id === "string" ? e.id : `it-legacy-${i}-${Date.now()}`,
        title: typeof e.title === "string" ? e.title : defaultTitle(it),
        createdAt: typeof e.createdAt === "string" ? e.createdAt : "",
        updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : "",
        groupSize: typeof e.groupSize === "number" ? e.groupSize : undefined,
        notes: typeof e.notes === "string" ? e.notes : undefined,
        isAiGenerated: typeof e.isAiGenerated === "boolean" ? e.isAiGenerated : undefined,
      },
    ];
  });
}

function readStored(): SavedItinerary[] {
  if (typeof window === "undefined") return [];
  try {
    return normalize(JSON.parse(localStorage.getItem(ITINERARIES_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function write(list: SavedItinerary[]) {
  localStorage.setItem(ITINERARIES_KEY, JSON.stringify(list));
}

export function getItineraries(): SavedItinerary[] {
  return readStored();
}

export function saveItinerary(itinerary: Itinerary, title?: string): SavedItinerary {
  const list = readStored();
  const now = new Date().toISOString();
  const existing = list.find((s) => s.id === itinerary.id);
  const total = itineraryTotal(itinerary);
  if (existing) {
    const updated: SavedItinerary = {
      ...itinerary,
      id: existing.id,
      title: title || existing.title,
      totalEstimatedCost: total,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    write(list.map((s) => (s.id === existing.id ? updated : s)));
    return updated;
  }
  const created: SavedItinerary = {
    ...itinerary,
    id: itinerary.id || `it-${Date.now()}`,
    title: title || defaultTitle(itinerary),
    totalEstimatedCost: total,
    createdAt: now,
    updatedAt: now,
  };
  write([...list, created]);
  return created;
}

export function deleteItinerary(id: string): SavedItinerary[] {
  const list = readStored().filter((s) => s.id !== id);
  write(list);
  return list;
}

export function renameItinerary(id: string, title: string): SavedItinerary[] {
  const list = readStored().map((s) =>
    s.id === id ? { ...s, title: title.trim() || s.title, updatedAt: new Date().toISOString() } : s,
  );
  write(list);
  return list;
}

export function setItineraryBudget(id: string, budget: number): SavedItinerary[] {
  const list = readStored().map((s) =>
    s.id === id
      ? {
          ...s,
          budget: budget > 0 ? budget : undefined,
          updatedAt: new Date().toISOString(),
        }
      : s,
  );
  write(list);
  return list;
}

export function itineraryPlaceIds(itinerary: Itinerary): string[] {
  return itinerary.days.flatMap((d) => d.places.map((p) => p.placeId));
}