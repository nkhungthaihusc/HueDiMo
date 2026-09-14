import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", authenticate, AuthController.getMe);
router.patch("/profile", authenticate, AuthController.updateProfile);
router.post("/logout", AuthController.logout);
router.post("/oauth-login", AuthController.oauthLogin);

export default router;

