import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Tất cả các route trong /api/admin đều yêu cầu đăng nhập và có role "admin"
router.use(authenticate, requireAdmin);

// Dashboard Statistics
router.get("/stats", AdminController.getStats);

// Places Management (CRUD & Moderation)
router.get("/places/export-csv", AdminController.exportPlacesCSV);
router.post("/places/import-csv/preview", AdminController.previewImportCSV);
router.post("/places/import-csv", AdminController.importPlacesCSV);
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

// Itineraries Management & Moderation
router.get("/itineraries", AdminController.getItineraries);
router.patch("/itineraries/:id/visibility", AdminController.toggleItineraryVisibility);
router.delete("/itineraries/:id", AdminController.deleteItinerary);
router.get("/itinerary-comments", AdminController.getItineraryComments);
router.delete("/itinerary-comments/:id", AdminController.deleteItineraryComment);

// API Request Logs & Auditing
router.get("/logs", AdminController.getLogs);
router.delete("/logs", AdminController.clearLogs);

// AI Itinerary Service Settings
router.get("/ai-settings", AdminController.getAISettings);
router.put("/ai-settings", AdminController.updateAISettings);
router.post("/ai-settings/test", AdminController.testAIModel);

export default router;

