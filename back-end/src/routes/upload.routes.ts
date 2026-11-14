import { Router } from "express";
import { presignUploads } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.post("/presign", authenticate, presignUploads);
export default router;
