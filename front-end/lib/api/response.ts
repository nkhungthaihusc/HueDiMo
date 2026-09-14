// Quy ước response API của HueDiMo (mọi route handler phải theo chuẩn này)
//
//   Thành công: HTTP 200 + { "data": T }
//   Thất bại  : HTTP (400/401/403/404/409/500/502...) + { "error": { "code", "message", "details?" } }
//
//   code là chuỗi máy đọc được (UPPER_SNAKE), message là chuỗi tiếng Việt cho người dùng.
//   Client dùng lib/api/client.ts (apiFetch) để giải nén - không tự parse response.

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return Response.json(body, { status });
}