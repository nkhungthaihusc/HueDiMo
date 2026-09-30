import { Router } from "express";
import { ItineraryController } from "../controllers/itinerary.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Sinh lộ trình du lịch thông minh bằng AI
router.post("/generate", ItineraryController.generate);
// Tương thích ngược với POST /api/itinerary
router.post("/", (req, res, next) => {
  // Nếu có trường places trong body thì là generate, nếu có days thì là save
  if (Array.isArray(req.body?.places)) {
    return ItineraryController.generate(req, res, next);
  }
  return authenticate(req, res, () => ItineraryController.saveItinerary(req, res, next));
});

// Lưu / Cập nhật lịch trình của cá nhân
router.post("/save", authenticate, ItineraryController.saveItinerary);

// Khám phá lịch trình từ cộng đồng
router.get("/community", ItineraryController.getCommunity);

// Danh sách lịch trình cá nhân của người dùng đang đăng nhập
router.get("/my", authenticate, ItineraryController.getMyItineraries);

// Xem chi tiết lịch trình
router.get("/:id", ItineraryController.getById);

// Đổi trạng thái hiển thị công khai (Public / Private)
router.patch("/:id/visibility", authenticate, ItineraryController.toggleVisibility);

// Xóa lịch trình
router.delete("/:id", authenticate, ItineraryController.deleteItinerary);

// Tương tác cảm xúc (Thả tim ❤️ / Like)
router.post("/:id/reaction", authenticate, ItineraryController.toggleReaction);

// Đánh dấu lưu lại (Bookmark 🔖)
router.post("/:id/bookmark", authenticate, ItineraryController.toggleBookmark);

// Sử dụng / Nhân bản lộ trình cộng đồng (Fork 🚀)
router.post("/:id/fork", authenticate, ItineraryController.forkItinerary);

// Bình luận / Góp ý (Comments 💬)
router.get("/:id/comments", ItineraryController.getComments);
router.post("/:id/comments", authenticate, ItineraryController.addComment);
router.delete("/:id/comments/:commentId", authenticate, ItineraryController.deleteComment);

export default router;
