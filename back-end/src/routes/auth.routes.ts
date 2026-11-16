import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { sendError } from "../utils/response";

const router = Router();
const limitOtpRequests = rateLimit({
  windowMs: 10 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    const retryAfter = Number(res.get("Retry-After"));
    const details = Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfterSeconds: retryAfter } : undefined;
    sendError(res, "RATE_LIMITED", "Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau.", 429, details);
  },
});

router.post("/register/otp", limitOtpRequests, AuthController.requestRegistrationOtp);
router.post("/register", AuthController.register);
router.post("/password/reset/otp", limitOtpRequests, AuthController.requestPasswordResetOtp);
router.post("/password/reset", AuthController.resetPassword);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.get("/me", authenticate, AuthController.getMe);
router.patch("/profile", authenticate, AuthController.updateProfile);
router.post("/password/otp", authenticate, AuthController.requestPasswordOtp);
router.patch("/password", authenticate, AuthController.changePassword);
router.post("/logout", AuthController.logout);
router.post("/oauth-login", AuthController.oauthLogin);

export default router;

