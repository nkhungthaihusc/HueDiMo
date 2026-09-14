import type { Review } from "@/lib/types";
import { getAccessToken, refreshTokens } from "@/lib/auth/logic";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface CreateReviewInput {
  authorName?: string;
  rating: number;
  comment: string;
  images?: string[];
}

export const ReviewAPI = {
  /**
   * Lấy danh sách đánh giá của 1 địa điểm từ backend database
   */
  async getPlaceReviews(placeId: string): Promise<Review[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/places/${placeId}/reviews`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Không thể tải danh sách đánh giá.");
      }
      return json.data || [];
    } catch (error) {
      console.error("Lỗi khi tải đánh giá từ server:", error);
      return [];
    }
  },

  /**
   * Đăng nhận xét mới kèm link ảnh lên backend
   */
  async createReview(placeId: string, input: CreateReviewInput): Promise<Review> {
    let token = getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let res = await fetch(`${BACKEND_URL}/api/places/${placeId}/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        authorName: input.authorName?.trim() || "Du khách Huế",
        rating: input.rating,
        comment: input.comment.trim(),
        images: input.images || [],
      }),
    });

    if (res.status === 401 && token) {
      const refreshRes = await refreshTokens();
      if (refreshRes.ok && refreshRes.accessToken) {
        token = refreshRes.accessToken;
        headers.Authorization = `Bearer ${token}`;
        res = await fetch(`${BACKEND_URL}/api/places/${placeId}/reviews`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            authorName: input.authorName?.trim() || "Du khách Huế",
            rating: input.rating,
            comment: input.comment.trim(),
            images: input.images || [],
          }),
        });
      }
    }

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || "Không thể gửi đánh giá.");
    }

    return json.data;
  },
};
