"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Tất cả các route trong /api/admin đều yêu cầu đăng nhập và có role "admin"
router.use(auth_middleware_1.authenticate, auth_middleware_1.requireAdmin);
// Dashboard Statistics
router.get("/stats", admin_controller_1.AdminController.getStats);
// Places Management (CRUD & Moderation)
router.get("/places/export-csv", admin_controller_1.AdminController.exportPlacesCSV);
router.post("/places/import-csv/preview", admin_controller_1.AdminController.previewImportCSV);
router.post("/places/import-csv", admin_controller_1.AdminController.importPlacesCSV);
router.get("/places", admin_controller_1.AdminController.getPlaces);
router.post("/places", admin_controller_1.AdminController.createPlace);
router.put("/places/:id", admin_controller_1.AdminController.updatePlace);
router.patch("/places/:id/status", admin_controller_1.AdminController.updatePlaceStatus);
router.delete("/places/:id", admin_controller_1.AdminController.deletePlace);
// Users Management & RBAC
router.get("/users", admin_controller_1.AdminController.getUsers);
router.patch("/users/:id/role", admin_controller_1.AdminController.updateUserRole);
router.patch("/users/:id/status", admin_controller_1.AdminController.updateUserStatus);
// Reviews Moderation
router.get("/reviews", admin_controller_1.AdminController.getReviews);
router.delete("/reviews/:id", admin_controller_1.AdminController.deleteReview);
// API Request Logs & Auditing
router.get("/logs", admin_controller_1.AdminController.getLogs);
router.delete("/logs", admin_controller_1.AdminController.clearLogs);
// AI Itinerary Service Settings
router.get("/ai-settings", admin_controller_1.AdminController.getAISettings);
router.put("/ai-settings", admin_controller_1.AdminController.updateAISettings);
router.post("/ai-settings/test", admin_controller_1.AdminController.testAIModel);
exports.default = router;
