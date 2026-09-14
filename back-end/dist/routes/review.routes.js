"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const router = (0, express_1.Router)({ mergeParams: true });
/**
 * GET /api/places/:placeId/reviews
 * Lấy danh sách nhận xét & hình ảnh của địa điểm
 */
router.get("/", review_controller_1.reviewController.getPlaceReviews);
/**
 * POST /api/places/:placeId/reviews
 * Người dùng đăng bài đánh giá và đính kèm danh sách ảnh
 */
router.post("/", review_controller_1.reviewController.createPlaceReview);
exports.default = router;
