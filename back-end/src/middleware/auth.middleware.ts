import type { Request, Response, NextFunction } from "express";
import { AuthService, type AuthUserPayload } from "../services/auth.service";
import { sendError } from "../utils/response";

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục thực hiện hành động này.", 401);
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    sendError(res, "UNAUTHORIZED", "Token xác thực không hợp lệ.", 401);
    return;
  }

  try {
    const decoded = AuthService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      sendError(res, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
      return;
    }
    sendError(res, "UNAUTHORIZED", "Token xác thực không hợp lệ.", 401);
  }
}

/**
 * Middleware kiểm tra quyền quản trị viên (Admin Role Guard)
 * Bắt buộc người dùng phải qua middleware `authenticate` trước đó.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendError(res, "UNAUTHORIZED", "Vui lòng đăng nhập để thực hiện hành động này.", 401);
    return;
  }

  if (req.user.role !== "admin") {
    sendError(res, "FORBIDDEN", "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền quản trị viên.", 403);
    return;
  }

  next();
}

