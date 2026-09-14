import { getAccessToken, refreshTokens, clearSession } from "@/lib/auth/logic";
import type { Place } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface ContributePlaceResponse {
  place: Place;
  message: string;
}

function normalizePlace(raw: any): Place {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    rating: Number(raw.rating ?? 0),
    description: raw.description || "",
    isLocal: Boolean(raw.is_local ?? raw.isLocal ?? true),
    status: raw.status || "pending",
    created_by: raw.created_by || raw.userId,
    userId: raw.userId || raw.created_by,
    created_at: raw.created_at || raw.createdAt,
    createdAt: raw.createdAt || raw.created_at,
    price: raw.price !== null && raw.price !== undefined ? Number(raw.price) : undefined,
    images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : (raw.image_url ? [raw.image_url] : undefined),
    address: raw.address || undefined,
    openingHours: raw.opening_hours || raw.openingHours || undefined,
    duration: raw.estimated_duration_minutes ? `${raw.estimated_duration_minutes} phút` : undefined,
    bestTime: raw.best_time_to_visit || raw.bestTime || undefined,
    highlights: Array.isArray(raw.highlights) ? raw.highlights : undefined,
    notes: raw.notes || undefined,
  };
}

/**
 * Gửi yêu cầu đóng góp địa điểm du lịch mới lên hệ thống.
 * Tự động xoay vòng token nếu token hết hạn (401).
 * Địa điểm sẽ được lưu với trạng thái Chờ duyệt (status: 'pending') và cần Admin duyệt trước khi hiển thị công khai.
 */
export async function contributePlace(data: Partial<Place>): Promise<ContributePlaceResponse> {
  let token = getAccessToken();

  // Nếu chưa có accessToken nhưng có refreshToken, thử lấy trước
  if (!token) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
    }
  }

  if (!token) {
    throw new Error("Vui lòng đăng nhập tài khoản để đóng góp địa điểm mới lên hệ thống.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  let res = await fetch(`${BACKEND_URL}/api/places`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  // Nếu token hết hạn (401), tự động xoay vòng refresh token và thử lại 1 lần
  if (res.status === 401) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${BACKEND_URL}/api/places`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
    } else {
      clearSession();
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
    }
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || "Gửi đóng góp địa điểm thất bại.");
  }

  return {
    place: normalizePlace(json.data?.place),
    message: json.data?.message || "Đóng góp địa điểm thành công!",
  };
}

/**
 * Lấy danh sách địa điểm do chính user hiện tại đóng góp từ server
 */
export async function getMyContributedPlaces(): Promise<Place[]> {
  let token = getAccessToken();

  if (!token) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
    }
  }

  if (!token) {
    return [];
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  let res = await fetch(`${BACKEND_URL}/api/places/my`, {
    headers,
  });

  if (res.status === 401) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${BACKEND_URL}/api/places/my`, {
        headers,
      });
    } else {
      return [];
    }
  }

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  const rawList = Array.isArray(json.data) ? json.data : [];
  return rawList.map(normalizePlace);
}

