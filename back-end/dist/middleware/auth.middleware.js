"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục thực hiện hành động này.", 401);
        return;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        (0, response_1.sendError)(res, "UNAUTHORIZED", "Token xác thực không hợp lệ.", 401);
        return;
    }
    try {
        const decoded = auth_service_1.AuthService.verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err.name === "TokenExpiredError") {
            (0, response_1.sendError)(res, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
            return;
        }
        (0, response_1.sendError)(res, "UNAUTHORIZED", "Token xác thực không hợp lệ.", 401);
    }
}
/**
 * Middleware kiểm tra quyền quản trị viên (Admin Role Guard)
 * Bắt buộc người dùng phải qua middleware `authenticate` trước đó.
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để thực hiện hành động này.", 401);
        return;
    }
    if (req.user.role !== "admin") {
        (0, response_1.sendError)(res, "FORBIDDEN", "Bạn không có quyền thực hiện hành động này. Yêu cầu quyền quản trị viên.", 403);
        return;
    }
    next();
}
