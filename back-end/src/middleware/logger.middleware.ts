import type { Request, Response, NextFunction } from "express";

export interface ApiRequestLog {
  id: string;
  // Thông tin chung (General Information)
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  protocol: string;
  httpVersion: string;
  statusCode: number;
  statusMessage?: string;
  durationMs: number;
  ip: string;
  timestamp: string;
  
  // Headers
  requestHeaders: Record<string, any>;
  responseHeaders: Record<string, any>;

  // Request Data
  queryParams: Record<string, any>;
  params: Record<string, any>;
  requestBody: any;

  // Response Data
  responseBody: any;

  // Client & User Context
  userAgent: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

const MAX_LOGS = 300;
const logStore: ApiRequestLog[] = [];

// Helper to mask sensitive fields in logs
function sanitizeData(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const clone: Record<string, any> = {};
  const sensitiveKeys = ["password", "password_hash", "token", "refreshToken", "accessToken", "authorization", "secret"];

  for (const key of Object.keys(data)) {
    const val = data[key];
    const isSensitive = sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()));

    if (isSensitive) {
      clone[key] = typeof val === "string" && val.length > 8 ? `${val.substring(0, 4)}...****` : "********";
    } else if (val && typeof val === "object") {
      clone[key] = sanitizeData(val);
    } else {
      clone[key] = val;
    }
  }
  return clone;
}

/**
 * Middleware bắt và ghi nhận chi tiết toàn bộ HTTP request qua server
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Capture full response body
  let capturedResponseBody: any = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function (body: any) {
    try {
      capturedResponseBody = sanitizeData(body);
    } catch {
      capturedResponseBody = body;
    }
    return originalJson(body);
  };

  res.send = function (body: any) {
    if (capturedResponseBody === null) {
      try {
        if (typeof body === "string") {
          try {
            capturedResponseBody = sanitizeData(JSON.parse(body));
          } catch {
            capturedResponseBody = body.length > 2000 ? body.slice(0, 2000) + "... (truncated)" : body;
          }
        } else {
          capturedResponseBody = body;
        }
      } catch {
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
    const user = (req as any).user;

    // Filter and sanitize request headers
    const requestHeaders = sanitizeData({ ...req.headers });
    // Capture response headers
    const responseHeaders = sanitizeData(res.getHeaders());

    const logEntry: ApiRequestLog = {
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
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1",
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

export const RequestLogStore = {
  getLogs(limit = 50, method?: string, statusCode?: number): ApiRequestLog[] {
    let filtered = logStore;
    if (method) {
      filtered = filtered.filter((l) => l.method.toUpperCase() === method.toUpperCase());
    }
    if (statusCode) {
      filtered = filtered.filter((l) => l.statusCode === statusCode);
    }
    return filtered.slice(0, limit);
  },

  clearLogs(): void {
    logStore.length = 0;
  },

  getStats() {
    const total = logStore.length;
    const errors = logStore.filter((l) => l.statusCode >= 400).length;
    const avgDuration =
      total > 0
        ? Math.round(logStore.reduce((acc, curr) => acc + curr.durationMs, 0) / total)
        : 0;

    return {
      totalRequestsLogged: total,
      errorCount: errors,
      avgLatencyMs: avgDuration,
    };
  },
};
