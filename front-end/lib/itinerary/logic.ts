import type { Itinerary } from "@/lib/itinerary/types";
import { itineraryTotal } from "@/lib/itinerary/types";

import { getSession } from "@/lib/auth/logic";

const BASE_ITINERARIES_KEY = "huedimo_itineraries";

function getStorageKey(): string {
  if (typeof window === "undefined") return BASE_ITINERARIES_KEY;
  try {
    const user = getSession();
    if (user && user.id) {
      return `${BASE_ITINERARIES_KEY}_${user.id}`;
    }
  } catch {}
  return `${BASE_ITINERARIES_KEY}_guest`;
}

export function clearItinerariesLocal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${BASE_ITINERARIES_KEY}_guest`);
  } catch {}
}

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

/**
 * Tạo chữ ký định danh nội dung hành trình (dựa trên các ngày và địa điểm)
 * Dùng để phát hiện và gộp các bản sao giống nhau giữa local và cloud
 */
export function getItinerarySignature(it: Itinerary | SavedItinerary): string {
  const dates = (it.days || []).map((d) => d.date).sort().join(",");
  const places = (it.days || []).flatMap((d) => (d.places || []).map((p) => p.placeId)).sort().join(",");
  return `${dates}::${places}`;
}

function normalize(raw: unknown): SavedItinerary[] {
  if (!Array.isArray(raw)) return [];
  const list: SavedItinerary[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i];
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (!Array.isArray(e.days)) continue;
    const it = e as unknown as Itinerary;
    if (it.days.every((d) => d.places.length === 0)) continue;

    const id = typeof e.id === "string" && e.id.trim() ? e.id.trim() : `it-legacy-${i}-${Date.now()}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    list.push({
      ...it,
      totalEstimatedCost: typeof e.totalEstimatedCost === "number" ? e.totalEstimatedCost : 0,
      id,
      title: typeof e.title === "string" ? e.title : defaultTitle(it),
      createdAt: typeof e.createdAt === "string" ? e.createdAt : "",
      updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : "",
      groupSize: typeof e.groupSize === "number" ? e.groupSize : undefined,
      notes: typeof e.notes === "string" ? e.notes : undefined,
      isAiGenerated: typeof e.isAiGenerated === "boolean" ? e.isAiGenerated : undefined,
      isPublic: typeof e.isPublic === "boolean" ? e.isPublic : Boolean(e.is_public),
      userId: typeof e.userId === "string" ? e.userId : typeof e.user_id === "string" ? e.user_id : undefined,
      likesCount: typeof e.likesCount === "number" ? e.likesCount : typeof e.likes_count === "number" ? e.likes_count : 0,
      commentsCount: typeof e.commentsCount === "number" ? e.commentsCount : typeof e.comments_count === "number" ? e.comments_count : 0,
      viewsCount: typeof e.viewsCount === "number" ? e.viewsCount : typeof e.views_count === "number" ? e.views_count : 0,
      forksCount: typeof e.forksCount === "number" ? e.forksCount : typeof e.forks_count === "number" ? e.forks_count : 0,
      isLiked: Boolean(e.isLiked ?? e.is_liked),
      isBookmarked: Boolean(e.isBookmarked ?? e.is_bookmarked),
    });
  }
  return list;
}

function readStored(): SavedItinerary[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      return normalize(JSON.parse(stored));
    }
    // Migration: nếu user đang login nhưng key user chưa có mà key cũ tồn tại, migrate sang
    const legacy = localStorage.getItem(BASE_ITINERARIES_KEY);
    if (legacy) {
      const parsedLegacy = normalize(JSON.parse(legacy));
      if (parsedLegacy.length > 0) {
        localStorage.setItem(key, JSON.stringify(parsedLegacy));
        localStorage.removeItem(BASE_ITINERARIES_KEY);
        return parsedLegacy;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function write(list: SavedItinerary[]) {
  // Deduplicate theo ID trước khi ghi
  const seen = new Set<string>();
  const unique = list.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  localStorage.setItem(getStorageKey(), JSON.stringify(unique));
}

export function getItineraries(): SavedItinerary[] {
  return readStored();
}

export function saveItinerary(itinerary: Itinerary, title?: string): SavedItinerary {
  const list = readStored();
  const now = new Date().toISOString();
  const total = itineraryTotal(itinerary);

  // 1. Tìm theo ID
  const existingById = list.find((s) => s.id === itinerary.id);
  if (existingById) {
    const updated: SavedItinerary = {
      ...itinerary,
      id: existingById.id,
      title: title || existingById.title,
      totalEstimatedCost: total,
      createdAt: existingById.createdAt,
      updatedAt: now,
      isPublic: itinerary.isPublic !== undefined ? itinerary.isPublic : existingById.isPublic,
      userId: itinerary.userId || existingById.userId,
    };
    write(list.map((s) => (s.id === existingById.id ? updated : s)));
    return updated;
  }

  // 2. Tìm theo Signature nếu trùng ngày và điểm dừng để không tạo bản sao thừa
  const sig = getItinerarySignature(itinerary);
  const existingBySig = list.find((s) => getItinerarySignature(s) === sig);
  if (existingBySig) {
    const updated: SavedItinerary = {
      ...itinerary,
      id: itinerary.id || existingBySig.id,
      title: title || existingBySig.title,
      totalEstimatedCost: total,
      createdAt: existingBySig.createdAt,
      updatedAt: now,
      isPublic: itinerary.isPublic !== undefined ? itinerary.isPublic : existingBySig.isPublic,
      userId: itinerary.userId || existingBySig.userId,
    };
    write(list.map((s) => (s.id === existingBySig.id ? updated : s)));
    return updated;
  }

  // 3. Tạo mới
  const currentUser = getSession();
  const created: SavedItinerary = {
    ...itinerary,
    id: itinerary.id || `it-${Date.now()}`,
    title: title || defaultTitle(itinerary),
    totalEstimatedCost: total,
    createdAt: now,
    updatedAt: now,
    userId: itinerary.userId || (currentUser ? currentUser.id : undefined),
  };
  write([...list, created]);
  return created;
}

/**
 * Cập nhật ID và thông tin của lịch trình sau khi lưu/đồng bộ lên server
 * Thay thế ID local (ví dụ it-123456) bằng UUID của server, loại bỏ triệt để trùng lặp
 */
export function updateItineraryId(oldId: string, updatedItinerary: SavedItinerary): SavedItinerary[] {
  const list = readStored();
  const oldSig = getItinerarySignature(updatedItinerary);

  // Lọc bỏ bất kỳ mục nào có oldId HOẶC có ID mới HOẶC có cùng signature
  const filtered = list.filter((s) => s.id !== oldId && s.id !== updatedItinerary.id && getItinerarySignature(s) !== oldSig);

  const merged = [updatedItinerary, ...filtered];
  write(merged);
  return merged;
}

export function updateItineraryLocal(updated: SavedItinerary): SavedItinerary[] {
  const list = readStored();
  const idx = list.findIndex((s) => s.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
    write(list);
    return list;
  }
  write([updated, ...list]);
  return readStored();
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