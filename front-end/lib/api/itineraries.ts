import { getAccessToken, refreshTokens, clearSession } from "@/lib/auth/logic";
import type { Itinerary } from "@/lib/itinerary/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface ItineraryComment {
  id: string;
  content: string;
  rating?: number | null;
  created_at: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  user_role?: string;
}

export interface CommunityItinerariesQuery {
  search?: string;
  transportMode?: string;
  daysCount?: number;
  maxBudget?: number;
  sort?: "newest" | "most_liked" | "most_viewed" | "highest_rated";
  page?: number;
  limit?: number;
}

export interface CommunityItinerariesResponse {
  items: Itinerary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      clearSession();
    }
  }

  return res;
}

function normalizeItineraryFromDB(raw: any): Itinerary {
  let parsedDays = [];
  if (typeof raw.days === "string") {
    try {
      parsedDays = JSON.parse(raw.days);
    } catch {
      parsedDays = [];
    }
  } else if (Array.isArray(raw.days)) {
    parsedDays = raw.days;
  }

  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary || "",
    totalEstimatedCost: Number(raw.total_estimated_cost ?? raw.totalEstimatedCost ?? 0),
    budget: raw.budget !== null && raw.budget !== undefined ? Number(raw.budget) : undefined,
    transportMode: raw.transport_mode || raw.transportMode || "motorbike",
    groupSize: raw.group_size ? Number(raw.group_size) : undefined,
    notes: raw.notes || undefined,
    isPublic: Boolean(raw.is_public ?? raw.isPublic ?? false),
    userId: raw.user_id || raw.userId,
    authorName: raw.author_name || raw.authorName || "Du khách Huế",
    authorAvatar: raw.author_avatar || raw.authorAvatar,
    likesCount: Number(raw.likes_count ?? raw.likesCount ?? 0),
    bookmarksCount: Number(raw.bookmarks_count ?? raw.bookmarksCount ?? 0),
    viewsCount: Number(raw.views_count ?? raw.viewsCount ?? 0),
    forksCount: Number(raw.forks_count ?? raw.forksCount ?? 0),
    commentsCount: Number(raw.comments_count ?? raw.commentsCount ?? 0),
    rating: raw.rating !== null && raw.rating !== undefined ? Number(raw.rating) : 5.0,
    isLiked: Boolean(raw.is_liked ?? raw.isLiked ?? false),
    isBookmarked: Boolean(raw.is_bookmarked ?? raw.isBookmarked ?? false),
    createdAt: raw.created_at || raw.createdAt,
    updatedAt: raw.updated_at || raw.updatedAt,
    days: parsedDays,
  };
}

export const ItineraryAPI = {
  /**
   * Lấy danh sách lịch trình công khai từ cộng đồng (hỗ trợ tìm kiếm, lọc ngày, lọc ngân sách, sắp xếp)
   */
  async getCommunity(params?: CommunityItinerariesQuery): Promise<CommunityItinerariesResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.transportMode) query.append("transportMode", params.transportMode);
    if (params?.daysCount) query.append("daysCount", String(params.daysCount));
    if (params?.maxBudget) query.append("maxBudget", String(params.maxBudget));
    if (params?.sort) query.append("sort", params.sort);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/community${qs}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể tải danh sách lịch trình cộng đồng.");
    }

    return {
      items: (json.data?.items || []).map(normalizeItineraryFromDB),
      pagination: json.data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 },
    };
  },

  /**
   * Lấy danh sách lịch trình cá nhân của người dùng hiện tại từ Cloud
   */
  async getMyItineraries(): Promise<Itinerary[]> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/my`);
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    return (Array.isArray(json.data) ? json.data : []).map(normalizeItineraryFromDB);
  },

  /**
   * Lấy chi tiết một lịch trình
   */
  async getById(id: string): Promise<Itinerary> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể nạp thông tin lịch trình.");
    }
    return normalizeItineraryFromDB(json.data);
  },

  /**
   * Lưu hoặc cập nhật lịch trình lên server
   */
  async saveToServer(itinerary: Itinerary, title?: string, isPublic?: boolean): Promise<Itinerary> {
    const dates = itinerary.days.map((d) => d.date).filter(Boolean).sort();
    const startDate = dates[0] || new Date().toISOString().slice(0, 10);
    const endDate = dates[dates.length - 1] || startDate;

    const body = {
      id: itinerary.id,
      title: title || itinerary.title || `Lộ trình Huế ${startDate}`,
      startDate,
      endDate,
      budget: itinerary.budget || itinerary.totalEstimatedCost,
      totalEstimatedCost: itinerary.totalEstimatedCost,
      transportMode: itinerary.transportMode || "motorbike",
      groupSize: itinerary.groupSize || 1,
      summary: itinerary.summary,
      days: itinerary.days,
      isPublic: isPublic !== undefined ? isPublic : (itinerary.isPublic ?? false),
    };

    const res = await authFetch(`${BACKEND_URL}/api/itineraries/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Lỗi khi lưu lịch trình lên máy chủ.");
    }

    return normalizeItineraryFromDB(json.data?.itinerary || json.data);
  },

  /**
   * Bật / tắt chế độ công khai cho lịch trình
   */
  async toggleVisibility(id: string, isPublic: boolean): Promise<{ message: string; isPublic: boolean }> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ isPublic }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể cập nhật trạng thái công khai.");
    }

    return {
      message: json.data?.message || "Cập nhật thành công.",
      isPublic,
    };
  },

  /**
   * Xóa lịch trình khỏi cơ sở dữ liệu
   */
  async deleteItinerary(id: string): Promise<void> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error?.message || "Không thể xóa lịch trình khỏi máy chủ.");
    }
  },

  /**
   * Thả cảm xúc (Like / Thả tim ❤️)
   */
  async toggleReaction(id: string): Promise<{ isLiked: boolean; likesCount: number }> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/reaction`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Vui lòng đăng nhập để thả tim.");
    }
    return json.data;
  },

  /**
   * Đánh dấu lưu lại (Bookmark 🔖)
   */
  async toggleBookmark(id: string): Promise<{ isBookmarked: boolean; bookmarksCount: number }> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/bookmark`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Vui lòng đăng nhập để đánh dấu lịch trình.");
    }
    return json.data;
  },

  /**
   * Sử dụng / Nhân bản lộ trình cộng đồng (Fork 🚀)
   */
  async forkItinerary(id: string): Promise<{ itinerary: Itinerary; message: string }> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/fork`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể nạp lộ trình.");
    }
    return {
      itinerary: normalizeItineraryFromDB(json.data?.itinerary || json.data),
      message: json.data?.message || "Đã nạp lộ trình thành công!",
    };
  },

  /**
   * Lấy danh sách bình luận
   */
  async getComments(id: string): Promise<ItineraryComment[]> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/comments`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  /**
   * Gửi bình luận / đánh giá mới
   */
  async addComment(id: string, content: string, rating?: number): Promise<ItineraryComment> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content, rating }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể gửi đánh giá.");
    }
    return json.data?.comment;
  },

  /**
   * Xóa bình luận
   */
  async deleteComment(id: string, commentId: string): Promise<void> {
    const res = await authFetch(`${BACKEND_URL}/api/itineraries/${id}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error?.message || "Không thể xóa bình luận.");
    }
  },
};
