import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Tất cả các route trong /api/admin đều yêu cầu đăng nhập và có role "admin"
router.use(authenticate, requireAdmin);

// Dashboard Statistics
router.get("/stats", AdminController.getStats);

// Places Management (CRUD & Moderation)
router.get("/places", AdminController.getPlaces);
router.post("/places", AdminController.createPlace);
router.put("/places/:id", AdminController.updatePlace);
router.patch("/places/:id/status", AdminController.updatePlaceStatus);
router.delete("/places/:id", AdminController.deletePlace);

// Users Management & RBAC
router.get("/users", AdminController.getUsers);
router.patch("/users/:id/role", AdminController.updateUserRole);
router.patch("/users/:id/status", AdminController.updateUserStatus);

// Reviews Moderation
router.get("/reviews", AdminController.getReviews);
router.delete("/reviews/:id", AdminController.deleteReview);

// API Request Logs & Auditing
router.get("/logs", AdminController.getLogs);
router.delete("/logs", AdminController.clearLogs);

export default router;

