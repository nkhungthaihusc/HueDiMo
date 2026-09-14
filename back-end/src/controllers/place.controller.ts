import type { Request, Response, NextFunction } from "express";
import { pool } from "../config/db";
import { sendSuccess, sendError } from "../utils/response";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper xóa dấu tiếng Việt phục vụ tìm kiếm thông minh
function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export const PlaceController = {
  /**
   * GET /api/places
   * Lấy danh sách địa điểm ĐÃ ĐƯỢC DUYỆT (status = 'approved')
   */
  async getPlaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.query;
      let query = "SELECT * FROM public.places WHERE (status = 'approved' OR status IS NULL)";
      const values: any[] = [];

      if (category && typeof category === "string" && category.trim()) {
        query += " AND category = $1";
        values.push(category.trim());
      }
      query += " ORDER BY rating DESC, name ASC";

      const result = await pool.query(query, values);
      sendSuccess(res, result.rows);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/places/search
   * Tìm kiếm trong các địa điểm ĐÃ ĐƯỢC DUYỆT (status = 'approved')
   */
  async searchPlaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5));

      if (!q) {
        const topPlaces = await pool.query(
          "SELECT * FROM public.places WHERE (status = 'approved' OR status IS NULL) ORDER BY rating DESC, name ASC LIMIT $1",
          [limit]
        );
        sendSuccess(res, topPlaces.rows);
        return;
      }

      const normalizedQ = removeAccents(q);

      const allPlacesRes = await pool.query(
        "SELECT * FROM public.places WHERE (status = 'approved' OR status IS NULL) ORDER BY rating DESC"
      );

      const matches = allPlacesRes.rows
        .map((place: any) => {
          const nameRaw = (place.name || "").toLowerCase();
          const nameNorm = removeAccents(place.name || "");
          const addressRaw = (place.address || "").toLowerCase();
          const addressNorm = removeAccents(place.address || "");
          const categoryRaw = (place.category || "").toLowerCase();
          const descRaw = (place.description || "").toLowerCase();
          const descNorm = removeAccents(place.description || "");

          let score = 0;
          const qLower = q.toLowerCase();

          if (nameRaw === qLower || nameNorm === normalizedQ) {
            score += 100;
          } else if (nameRaw.startsWith(qLower) || nameNorm.startsWith(normalizedQ)) {
            score += 60;
          } else if (nameRaw.includes(qLower) || nameNorm.includes(normalizedQ)) {
            score += 40;
          } else if (addressRaw.includes(qLower) || addressNorm.includes(normalizedQ)) {
            score += 20;
          } else if (categoryRaw.includes(qLower) || categoryRaw.includes(normalizedQ)) {
            score += 15;
          } else if (descRaw.includes(qLower) || descNorm.includes(normalizedQ)) {
            score += 10;
          }

          return { place, score };
        })
        .filter((item: any) => item.score > 0)
        .sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return Number(b.place.rating || 0) - Number(a.place.rating || 0);
        })
        .slice(0, limit)
        .map((item: any) => item.place);

      sendSuccess(res, matches);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/places
   * Người dùng đóng góp địa điểm mới -> Lưu với trạng thái Chờ duyệt (status = 'pending')
   */
  async contributePlace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        name,
        category,
        lat,
        lng,
        address,
        price = 0,
        opening_hours = "",
        openingHours = "",
        estimated_duration_minutes = 60,
        best_time_to_visit = "",
        description = "",
        image_url = "",
        imageUrl = "",
        images = [],
        highlights = [],
        notes = "",
      } = req.body;

      if (!name || typeof name !== "string" || !name.trim()) {
        sendError(res, "VALIDATION_ERROR", "Tên địa điểm không được để trống.", 422, { field: "name" });
        return;
      }

      if (!category || typeof category !== "string") {
        sendError(res, "VALIDATION_ERROR", "Danh mục không hợp lệ.", 422, { field: "category" });
        return;
      }

      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng) || numLat < 15.0 || numLat > 18.0 || numLng < 106.0 || numLng > 109.0) {
        sendError(res, "VALIDATION_ERROR", "Tọa độ không hợp lệ hoặc nằm ngoài khu vực Thừa Thiên Huế.", 422, { field: "coordinates" });
        return;
      }

      let id = slugify(name);
      if (!id) id = `contrib-${Date.now()}`;
      id = `${id}-${Date.now().toString().slice(-4)}`;

      const finalImageUrl = (image_url || imageUrl || (Array.isArray(images) && images[0]) || "").trim();
      const finalImages = Array.isArray(images) && images.length > 0 ? images : (finalImageUrl ? [finalImageUrl] : []);
      const finalOpeningHours = (opening_hours || openingHours || "").trim();
      const created_by = req.user?.id || null;

      const insertRes = await pool.query(
        `INSERT INTO public.places (
          id, name, category, lat, lng, address, price, is_local,
          opening_hours, estimated_duration_minutes, best_time_to_visit,
          rating, description, image_url, images, highlights, notes,
          status, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, true,
          $8, $9, $10,
          0.0, $11, $12, $13, $14, $15,
          'pending', $16, NOW(), NOW()
        ) RETURNING *`,
        [
          id,
          name.trim(),
          category.trim(),
          numLat,
          numLng,
          (address || "").trim(),
          Number(price) || 0,
          finalOpeningHours,
          Number(estimated_duration_minutes) || 60,
          (best_time_to_visit || "").trim(),
          (description || "").trim(),
          finalImageUrl,
          finalImages,
          Array.isArray(highlights) ? highlights : [],
          (notes || "").trim(),
          created_by,
        ]
      );

      sendSuccess(
        res,
        {
          place: insertRes.rows[0],
          message: "Đóng góp địa điểm thành công! Địa điểm đang được chờ Ban Quản Trị phê duyệt.",
        },
        201
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/places/my
   * Lấy danh sách địa điểm do chính người dùng hiện tại đóng góp (bất kể trạng thái pending/approved/rejected)
   */
  async getMyContributedPlaces(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, "UNAUTHORIZED", "Vui lòng đăng nhập để xem các địa điểm đã đóng góp.", 401);
        return;
      }

      const result = await pool.query(
        "SELECT * FROM public.places WHERE created_by = $1 ORDER BY created_at DESC",
        [userId]
      );

      sendSuccess(res, result.rows);
    } catch (error) {
      next(error);
    }
  },
};
