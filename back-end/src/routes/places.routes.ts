import { Router } from "express";
import { PlaceController } from "../controllers/place.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Lấy danh sách địa điểm đã được duyệt (status = 'approved')
router.get("/", PlaceController.getPlaces);

// Tìm kiếm địa điểm đã được duyệt (status = 'approved')
router.get("/search", PlaceController.searchPlaces);

// Lấy danh sách địa điểm do chính user đóng góp (kèm trạng thái duyệt)
router.get("/my", authenticate, PlaceController.getMyContributedPlaces);

// Người dùng đăng nhập đóng góp địa điểm mới (status = 'pending')
router.post("/", authenticate, PlaceController.contributePlace);

export default router;
