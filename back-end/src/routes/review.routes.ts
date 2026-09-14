import { Router } from "express";
import { reviewController } from "../controllers/review.controller";

const router = Router({ mergeParams: true });

/**
 * GET /api/places/:placeId/reviews
 * Lấy danh sách nhận xét & hình ảnh của địa điểm
 */
router.get("/", reviewController.getPlaceReviews);

/**
 * POST /api/places/:placeId/reviews
 * Người dùng đăng bài đánh giá và đính kèm danh sách ảnh
 */
router.post("/", reviewController.createPlaceReview);

export default router;
