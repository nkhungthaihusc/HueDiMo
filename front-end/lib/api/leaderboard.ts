import { getAccessToken, refreshTokens, clearSession } from "@/lib/auth/logic";
import type { User } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url?: string;
  points: number;
  checkin_count: number;
  rank?: number;
}

export interface CheckinRecord {
  id: string;
  user_id: string;
  place_id: string;
  points_earned: number;
  note?: string;
  created_at: string;
  place_name?: string;
}

/**
 * Lấy danh sách bảng xếp hạng du khách có điểm cao nhất
 */
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/leaderboard?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json.data)) return json.data;
    return json.data?.leaderboard || [];
  } catch {
    return [];
  }
}

/**
 * Người dùng thực hiện check-in tại một địa điểm để nhận 100 điểm thưởng
 */
export async function checkinPlace(
  placeId: string,
  note?: string,
  userCoords?: { lat: number; lng: number }
): Promise<{ ok: boolean; pointsEarned?: number; user?: User; error?: string }> {
  let token = getAccessToken();
  if (!token) {
    return { ok: false, error: "Vui lòng đăng nhập để thực hiện check-in nhận điểm thưởng!" };
  }

  const payload: Record<string, any> = { placeId, note };
  if (userCoords) {
    payload.userLat = userCoords.lat;
    payload.userLng = userCoords.lng;
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/checkins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) {
        clearSession();
        return { ok: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!" };
      }
      token = refreshRes.accessToken;
      res = await fetch(`${BACKEND_URL}/api/checkins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message || "Check-in không thành công.",
      };
    }

    return {
      ok: true,
      pointsEarned: json.data?.pointsEarned || 100,
      user: json.data?.user,
    };
  } catch {
    return {
      ok: false,
      error: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Lấy lịch sử check-in của người dùng hiện tại
 */
export async function getMyCheckins(): Promise<CheckinRecord[]> {
  let token = getAccessToken();
  if (!token) return [];

  try {
    let res = await fetch(`${BACKEND_URL}/api/checkins/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) return [];
      token = refreshRes.accessToken;
      res = await fetch(`${BACKEND_URL}/api/checkins/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.checkins || [];
  } catch {
    return [];
  }
}
