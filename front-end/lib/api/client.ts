import { getAccessToken, refreshTokens, getSession } from "@/lib/auth/logic";
import type { ApiErrorBody } from "@/lib/api/response";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Gọi API theo quy ước chung: trả về phần data (T), ném ApiError khi lỗi.
export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return readApiResponse<T>(await fetch(input, init));
}

export async function readApiResponse<T>(res: Response): Promise<T> {
  const body = await readJson(res);

  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.message ?? `Yêu cầu thất bại (mã lỗi ${res.status}).`,
      err?.code ?? "INTERNAL_ERROR",
      res.status,
    );
  }

  const data = (body as { data?: T } | null)?.data;
  if (data === undefined) {
    throw new ApiError("Phản hồi máy chủ thiếu dữ liệu.", "INTERNAL_ERROR", res.status);
  }
  return data;
}

async function readJson(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const accountId = getSession()?.id;
  let token = getAccessToken();

  if (!token) {
    const refreshRes = await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken) {
      token = refreshRes.accessToken;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && getSession()?.id === accountId) {
    const latestToken = getAccessToken();
    const refreshRes = latestToken && latestToken !== token
      ? { ok: true, accessToken: latestToken }
      : await refreshTokens();
    if (refreshRes.ok && refreshRes.accessToken && getSession()?.id === accountId) {
      token = refreshRes.accessToken;
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  return res;
}
