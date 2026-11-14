"use client";

import { useEffect, useState } from "react";
import { ItineraryAPI } from "@/lib/api/itineraries";
import { getItineraries, getItinerarySignature, type SavedItinerary } from "@/lib/itinerary/logic";

export function useSavedItineraries(userId?: string) {
  const [list, setList] = useState<SavedItinerary[]>(() => getItineraries());
  const [loadedUser, setLoadedUser] = useState<string>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Đồng bộ thêm danh sách lịch trình từ Cloud nếu user đã đăng nhập
  useEffect(() => {
    setList(getItineraries());
    setLoadedUser(undefined);
    setError(false);
    if (!userId) return;
    let isMounted = true;
    ItineraryAPI.getMyItineraries()
      .then((serverList) => {
        if (!isMounted) return;
        setList((localList) => {
          const serverIds = new Set(serverList.map((item) => item.id));
          const merged = localList.filter((item) => !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(item.id) || serverIds.has(item.id));
          for (const s of serverList) {
            const serverSig = getItinerarySignature(s);
            // Tìm mục trùng ID hoặc trùng Signature nội dung
            const idx = merged.findIndex((m) => m.id === s.id || getItinerarySignature(m) === serverSig);
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                ...s,
                isAiGenerated: s.isAiGenerated ?? merged[idx].isAiGenerated,
                id: s.id || merged[idx].id,
                title: s.title || merged[idx].title,
                budget: s.budget,
                startDate: s.startDate,
                endDate: s.endDate,
                currentLocation: s.currentLocation,
                preferences: s.preferences,
                isPublic: s.isPublic,
                likesCount: s.likesCount,
                commentsCount: s.commentsCount,
                viewsCount: s.viewsCount,
                userId: s.userId || userId,
              };
            } else {
              merged.push({
                ...s,
                id: s.id || `cloud-${Date.now()}`,
                title: s.title || `Lộ trình ${s.days.length} ngày`,
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: s.updatedAt || new Date().toISOString(),
                userId: s.userId || userId,
              });
            }
          }

          // Lọc triệt để trùng lặp cả về ID lẫn Signature
          const seenIds = new Set<string>();
          const seenSigs = new Set<string>();
          const deduplicated = merged.filter((item) => {
            const sig = getItinerarySignature(item);
            if (seenIds.has(item.id) || seenSigs.has(sig)) return false;
            seenIds.add(item.id);
            seenSigs.add(sig);
            return true;
          });

          return deduplicated;
        });
      })
      .catch(() => { if (isMounted) setError(true); })
      .finally(() => { if (isMounted) setLoadedUser(userId); });

    return () => {
      isMounted = false;
    };
  }, [userId, attempt]);

  const loading = Boolean(userId && loadedUser !== userId);
  return { list: loading || error ? [] : list, setList, loading, error, retry: () => {
    setLoadedUser(undefined);
    setAttempt((current) => current + 1);
  } };
}
