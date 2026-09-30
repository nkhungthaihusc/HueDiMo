"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const itinerary_controller_1 = require("../controllers/itinerary.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Sinh lộ trình du lịch thông minh bằng AI
router.post("/generate", itinerary_controller_1.ItineraryController.generate);
// Tương thích ngược với POST /api/itinerary
router.post("/", (req, res, next) => {
    // Nếu có trường places trong body thì là generate, nếu có days thì là save
    if (Array.isArray(req.body?.places)) {
        return itinerary_controller_1.ItineraryController.generate(req, res, next);
    }
    return (0, auth_middleware_1.authenticate)(req, res, () => itinerary_controller_1.ItineraryController.saveItinerary(req, res, next));
});
// Lưu / Cập nhật lịch trình của cá nhân
router.post("/save", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.saveItinerary);
// Khám phá lịch trình từ cộng đồng
router.get("/community", itinerary_controller_1.ItineraryController.getCommunity);
// Danh sách lịch trình cá nhân của người dùng đang đăng nhập
router.get("/my", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.getMyItineraries);
// Xem chi tiết lịch trình
router.get("/:id", itinerary_controller_1.ItineraryController.getById);
// Đổi trạng thái hiển thị công khai (Public / Private)
router.patch("/:id/visibility", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.toggleVisibility);
// Xóa lịch trình
router.delete("/:id", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.deleteItinerary);
// Tương tác cảm xúc (Thả tim ❤️ / Like)
router.post("/:id/reaction", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.toggleReaction);
// Đánh dấu lưu lại (Bookmark 🔖)
router.post("/:id/bookmark", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.toggleBookmark);
// Sử dụng / Nhân bản lộ trình cộng đồng (Fork 🚀)
router.post("/:id/fork", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.forkItinerary);
// Bình luận / Góp ý (Comments 💬)
router.get("/:id/comments", itinerary_controller_1.ItineraryController.getComments);
router.post("/:id/comments", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.addComment);
router.delete("/:id/comments/:commentId", auth_middleware_1.authenticate, itinerary_controller_1.ItineraryController.deleteComment);
exports.default = router;
