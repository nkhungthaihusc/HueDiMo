import type { CategoryId, Place } from "@/lib/types";
import { PLACES } from "@/lib/data/places";

const PLACES_KEY = "huedimo_places";

function readStored(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLACES_KEY) ?? "[]") as Place[];
  } catch {
    return [];
  }
}

export function getAllPlaces(): Place[] {
  return [...PLACES, ...readStored()];
}

export function getAllUserContributedPlaces(): Place[] {
  return readStored();
}

let cachedPlaces: Place[] | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  cachedPlaces = null;
  listeners.forEach((l) => l());
}

export function subscribePlaces(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPlacesSnapshot(): Place[] {
  if (cachedPlaces === null) cachedPlaces = getAllPlaces();
  return cachedPlaces;
}

export function getPlacesServerSnapshot(): Place[] {
  return PLACES;
}

export function addPlace(input: {
  id?: string;
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  description: string;
  price?: number;
  images?: string[];
  address?: string;
  openingHours?: string;
  duration?: string;
  bestTime?: string;
  highlights?: string[];
  notes?: string;
  status?: "pending" | "approved" | "rejected";
  created_by?: string;
  userId?: string;
  created_at?: string;
  createdAt?: string;
}): Place {
  const place: Place = {
    id: input.id || `pl-${Date.now()}`,
    name: input.name.trim(),
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    rating: 0,
    description: input.description.trim(),
    isLocal: true,
    // Địa điểm mới đóng góp bởi người dùng mặc định mang trạng thái 'pending' (Chờ duyệt)
    status: input.status || "pending",
    created_by: input.created_by || input.userId,
    userId: input.userId || input.created_by,
    created_at: input.created_at || input.createdAt || new Date().toISOString(),
    createdAt: input.createdAt || input.created_at || new Date().toISOString(),
    price:
      input.price !== undefined && Number.isFinite(input.price) && input.price > 0
        ? Math.round(input.price)
        : undefined,
    images: input.images && input.images.length > 0 ? input.images : undefined,
    address: input.address?.trim() || undefined,
    openingHours: input.openingHours?.trim() || undefined,
    duration: input.duration?.trim() || undefined,
    bestTime: input.bestTime?.trim() || undefined,
    highlights: input.highlights && input.highlights.length > 0 ? input.highlights : undefined,
    notes: input.notes?.trim() || undefined,
  };
  const stored = readStored();
  const existingIdx = stored.findIndex((p) => p.id === place.id);
  if (existingIdx >= 0) {
    stored[existingIdx] = { ...stored[existingIdx], ...place };
  } else {
    stored.push(place);
  }
  localStorage.setItem(PLACES_KEY, JSON.stringify(stored));
  notify();
  return place;
}

/**
 * Đồng bộ danh sách địa điểm đã đóng góp từ máy chủ vào bộ nhớ local
 */
export function syncUserContributedPlaces(serverPlaces: Place[]) {
  if (!serverPlaces || serverPlaces.length === 0) return;
  const stored = readStored();
  const storedMap = new Map(stored.map((p) => [p.id, p]));

  serverPlaces.forEach((sp) => {
    storedMap.set(sp.id, { ...(storedMap.get(sp.id) || {}), ...sp });
  });

  const merged = Array.from(storedMap.values());
  localStorage.setItem(PLACES_KEY, JSON.stringify(merged));
  notify();
}

export function approvePlace(id: string): Place | null {
  const stored = readStored();
  const place = stored.find((p) => p.id === id);
  if (place) {
    place.status = "approved";
    localStorage.setItem(PLACES_KEY, JSON.stringify(stored));
    notify();
    return place;
  }
  return null;
}

export function rejectPlace(id: string): Place | null {
  const stored = readStored();
  const place = stored.find((p) => p.id === id);
  if (place) {
    place.status = "rejected";
    localStorage.setItem(PLACES_KEY, JSON.stringify(stored));
    notify();
    return place;
  }
  return null;
}