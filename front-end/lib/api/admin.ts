import { getAccessToken, refreshTokens, clearSession } from "@/lib/auth/logic";
import type { Place, User } from "@/lib/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface AdminStats {
  overview: {
    totalPlaces: number;
    pendingPlaces?: number;
    totalUsers: number;
    totalReviews: number;
    avgRating: number;
  };
  categoryDistribution: { category: string; count: number }[];
  recentPlaces: Place[];
}

export interface AdminPlacesResponse {
  items: Place[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUsersResponse {
  items: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReviewsResponse {
  items: {
    id: string;
    place_id: string;
    place_name?: string;
    author_name: string;
    rating: number;
    comment: string;
    images?: string[];
    created_at: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch wrapper tự động đính kèm Bearer token và cơ chế Refresh Token Rotation khi gặp 401
 */
async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  let token = getAccessToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  let res = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Nếu token hết hạn (401), xoay vòng refresh token rồi thử lại
  if (res.status === 401) {
    const refreshRes = await refreshTokens();
    if (!refreshRes.ok || !refreshRes.accessToken) {
      clearSession();
      throw new Error("UNAUTHORIZED");
    }

    headers.Authorization = `Bearer ${refreshRes.accessToken}`;
    res = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || "Đã xảy ra lỗi khi thực hiện thao tác quản trị.");
  }

  return json.data;
}

export const AdminAPI = {
  // Stats
  async getStats(): Promise<AdminStats> {
    return adminFetch("/api/admin/stats");
  },

  // Places
  async getPlaces(params?: { page?: number; limit?: number; q?: string; category?: string; status?: string }): Promise<AdminPlacesResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.q) query.append("q", params.q);
    if (params?.category) query.append("category", params.category);
    if (params?.status && params.status !== "all") query.append("status", params.status);

    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminFetch(`/api/admin/places${qs}`);
  },

  async createPlace(data: Partial<Place>): Promise<Place> {
    return adminFetch("/api/admin/places", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updatePlace(id: string, data: Partial<Place>): Promise<Place> {
    return adminFetch(`/api/admin/places/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async updatePlaceStatus(id: string, status: "pending" | "approved" | "rejected"): Promise<Place> {
    return adminFetch(`/api/admin/places/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async deletePlace(id: string): Promise<{ id: string; deleted: boolean; message: string }> {
    return adminFetch(`/api/admin/places/${id}`, {
      method: "DELETE",
    });
  },

  // Users
  async getUsers(params?: { page?: number; limit?: number; q?: string; role?: string }): Promise<AdminUsersResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.q) query.append("q", params.q);
    if (params?.role) query.append("role", params.role);

    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminFetch(`/api/admin/users${qs}`);
  },

  async updateUserRole(id: string, role: "admin" | "user"): Promise<User> {
    return adminFetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  async updateUserStatus(id: string, status: "active" | "banned"): Promise<User & { message: string }> {
    return adminFetch(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // Reviews
  async getReviews(params?: { page?: number; limit?: number }): Promise<AdminReviewsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminFetch(`/api/admin/reviews${qs}`);
  },

  async deleteReview(id: string): Promise<{ id: string; deleted: boolean }> {
    return adminFetch(`/api/admin/reviews/${id}`, {
      method: "DELETE",
    });
  },

  // Logs
  async getLogs(params?: { limit?: number; method?: string; statusCode?: number }): Promise<{
    items: {
      id: string;
      method: string;
      url: string;
      originalUrl: string;
      path: string;
      protocol: string;
      httpVersion: string;
      statusCode: number;
      statusMessage?: string;
      durationMs: number;
      ip: string;
      timestamp: string;
      requestHeaders: Record<string, any>;
      responseHeaders: Record<string, any>;
      queryParams: Record<string, any>;
      params: Record<string, any>;
      requestBody: any;
      responseBody: any;
      userAgent: string;
      userId?: string;
      userEmail?: string;
      userRole?: string;
    }[];
    stats: {
      totalRequestsLogged: number;
      errorCount: number;
      avgLatencyMs: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.method) query.append("method", params.method);
    if (params?.statusCode) query.append("statusCode", String(params.statusCode));

    const qs = query.toString() ? `?${query.toString()}` : "";
    return adminFetch(`/api/admin/logs${qs}`);
  },


  async clearLogs(): Promise<{ message: string }> {
    return adminFetch("/api/admin/logs", {
      method: "DELETE",
    });
  },
};

