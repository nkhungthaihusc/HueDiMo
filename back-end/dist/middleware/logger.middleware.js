"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLogStore = void 0;
exports.requestLogger = requestLogger;
const MAX_LOGS = 300;
const logStore = [];
// Helper to mask sensitive fields in logs
function sanitizeData(data) {
    if (!data)
        return data;
    if (typeof data !== "object")
        return data;
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }
    const clone = {};
    const sensitiveKeys = ["password", "password_hash", "token", "refreshToken", "accessToken", "authorization", "secret"];
    for (const key of Object.keys(data)) {
        const val = data[key];
        const isSensitive = sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()));
        if (isSensitive) {
            clone[key] = typeof val === "string" && val.length > 8 ? `${val.substring(0, 4)}...****` : "********";
        }
        else if (val && typeof val === "object") {
            clone[key] = sanitizeData(val);
        }
        else {
            clone[key] = val;
        }
    }
    return clone;
}
/**
 * Middleware bắt và ghi nhận chi tiết toàn bộ HTTP request qua server
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    // Capture full response body
    let capturedResponseBody = null;
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    res.json = function (body) {
        try {
            capturedResponseBody = sanitizeData(body);
        }
        catch {
            capturedResponseBody = body;
        }
        return originalJson(body);
    };
    res.send = function (body) {
        if (capturedResponseBody === null) {
            try {
                if (typeof body === "string") {
                    try {
                        capturedResponseBody = sanitizeData(JSON.parse(body));
                    }
                    catch {
                        capturedResponseBody = body.length > 2000 ? body.slice(0, 2000) + "... (truncated)" : body;
                    }
                }
                else {
                    capturedResponseBody = body;
                }
            }
            catch {
                capturedResponseBody = body;
            }
        }
        return originalSend(body);
    };
    res.on("finish", () => {
        // Không ghi log chính API lấy log để tránh đệ quy vòng lặp
        if (req.originalUrl.includes("/api/admin/logs")) {
            return;
        }
        const durationMs = Date.now() - startTime;
        const user = req.user;
        // Filter and sanitize request headers
        const requestHeaders = sanitizeData({ ...req.headers });
        // Capture response headers
        const responseHeaders = sanitizeData(res.getHeaders());
        const logEntry = {
            id,
            // Thông tin chung
            method: req.method,
            url: req.url,
            originalUrl: req.originalUrl || req.url,
            path: req.path,
            protocol: req.protocol.toUpperCase(),
            httpVersion: req.httpVersion,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            durationMs,
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
            timestamp: new Date().toISOString(),
            // Headers
            requestHeaders,
            responseHeaders,
            // Request Body & Params
            queryParams: req.query || {},
            params: req.params || {},
            requestBody: sanitizeData(req.body),
            // Full Response Body
            responseBody: capturedResponseBody,
            // Context
            userAgent: req.headers["user-agent"] || "unknown",
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
        };
        logStore.unshift(logEntry);
        if (logStore.length > MAX_LOGS) {
            logStore.pop();
        }
    });
    next();
}
exports.RequestLogStore = {
    getLogs(limit = 50, method, statusCode) {
        let filtered = logStore;
        if (method) {
            filtered = filtered.filter((l) => l.method.toUpperCase() === method.toUpperCase());
        }
        if (statusCode) {
            filtered = filtered.filter((l) => l.statusCode === statusCode);
        }
        return filtered.slice(0, limit);
    },
    clearLogs() {
        logStore.length = 0;
    },
    getStats() {
        const total = logStore.length;
        const errors = logStore.filter((l) => l.statusCode >= 400).length;
        const avgDuration = total > 0
            ? Math.round(logStore.reduce((acc, curr) => acc + curr.durationMs, 0) / total)
            : 0;
        return {
            totalRequestsLogged: total,
            errorCount: errors,
            avgLatencyMs: avgDuration,
        };
    },
};
