"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const place_controller_1 = require("../controllers/place.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Lấy danh sách địa điểm đã được duyệt (status = 'approved')
router.get("/", place_controller_1.PlaceController.getPlaces);
// Tìm kiếm địa điểm đã được duyệt (status = 'approved')
router.get("/search", place_controller_1.PlaceController.searchPlaces);
// Lấy danh sách địa điểm do chính user đóng góp (kèm trạng thái duyệt)
router.get("/my", auth_middleware_1.authenticate, place_controller_1.PlaceController.getMyContributedPlaces);
// Người dùng đăng nhập đóng góp địa điểm mới (status = 'pending')
router.post("/", auth_middleware_1.authenticate, place_controller_1.PlaceController.contributePlace);
exports.default = router;
