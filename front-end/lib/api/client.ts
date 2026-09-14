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
  const res = await fetch(input, init);
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