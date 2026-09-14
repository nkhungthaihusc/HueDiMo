"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewController = void 0;
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
exports.reviewController = {
    /**
     * GET /api/places/:placeId/reviews
     * Lấy danh sách các đánh giá của 1 địa điểm cụ thể
     */
    async getPlaceReviews(req, res, next) {
        try {
            const { placeId } = req.params;
            if (!placeId) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Thiếu mã địa điểm (placeId).", 400);
                return;
            }
            const result = await db_1.pool.query(`SELECT id, place_id, user_id, author_name, rating, comment, images, created_at
         FROM public.reviews
         WHERE place_id = $1
         ORDER BY created_at DESC`, [placeId]);
            // Đảm bảo images luôn là mảng string
            const formattedReviews = result.rows.map((row) => ({
                id: row.id,
                placeId: row.place_id,
                userId: row.user_id,
                authorName: row.author_name || "Du khách ẩn danh",
                rating: Number(row.rating) || 5,
                comment: row.comment || "",
                images: Array.isArray(row.images) ? row.images : [],
                createdAt: row.created_at,
            }));
            (0, response_1.sendSuccess)(res, formattedReviews);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/places/:placeId/reviews
     * Tạo một bài đánh giá mới kèm danh sách URL hình ảnh
     */
    async createPlaceReview(req, res, next) {
        try {
            const { placeId } = req.params;
            const { authorName, rating, comment, images = [] } = req.body;
            if (!placeId) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Thiếu mã địa điểm (placeId).", 400);
                return;
            }
            if (!comment || typeof comment !== "string" || !comment.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Nội dung nhận xét không được để trống.", 422, { field: "comment" });
                return;
            }
            const numRating = Number(rating);
            if (isNaN(numRating) || numRating < 1 || numRating > 5) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Điểm đánh giá phải từ 1 đến 5 sao.", 422, { field: "rating" });
                return;
            }
            // Kiểm tra xem địa điểm có tồn tại trong bảng places không
            const placeCheck = await db_1.pool.query("SELECT id, name FROM public.places WHERE id = $1", [placeId]);
            if (placeCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy địa điểm '${placeId}'.`, 404);
                return;
            }
            // Đảm bảo images là mảng chuỗi
            const sanitizedImages = Array.isArray(images)
                ? images.filter((img) => typeof img === "string" && img.trim().length > 0)
                : [];
            const cleanAuthorName = typeof authorName === "string" && authorName.trim()
                ? authorName.trim()
                : "Du khách Huế";
            const insertRes = await db_1.pool.query(`INSERT INTO public.reviews (place_id, author_name, rating, comment, images, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, place_id, user_id, author_name, rating, comment, images, created_at`, [placeId, cleanAuthorName, numRating, comment.trim(), sanitizedImages]);
            const createdReview = insertRes.rows[0];
            // Tự động tính toán lại rating trung bình cho địa điểm đó
            try {
                const avgRes = await db_1.pool.query(`SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating FROM public.reviews WHERE place_id = $1`, [placeId]);
                const newAvg = Number(avgRes.rows[0]?.avg_rating);
                if (newAvg && !isNaN(newAvg)) {
                    await db_1.pool.query(`UPDATE public.places SET rating = $1 WHERE id = $2`, [newAvg, placeId]);
                }
            }
            catch (calcErr) {
                console.warn("Cảnh báo: Không thể tự cập nhật avg rating trong places:", calcErr);
            }
            (0, response_1.sendSuccess)(res, {
                id: createdReview.id,
                placeId: createdReview.place_id,
                authorName: createdReview.author_name,
                rating: Number(createdReview.rating),
                comment: createdReview.comment,
                images: createdReview.images || [],
                createdAt: createdReview.created_at,
            }, 201);
        }
        catch (error) {
            next(error);
        }
    },
};
