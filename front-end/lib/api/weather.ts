import { apiFetch } from "./client";
import type { VrainApiResponse } from "@/lib/types/weather";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

/**
 * Lấy dữ liệu lượng mưa các trạm quan trắc Huế và tóm tắt rủi ro từ Backend API
 */
export async function fetchRainfallData(): Promise<VrainApiResponse> {
  // Backend trả về envelope { data: { source, updatedAt, summary, stations, error? } }
  // apiFetch tự động trích xuất data từ envelope
  const data = await apiFetch<{
    source: "live" | "fallback";
    updatedAt: string;
    summary: any;
    stations: any[];
    error?: string;
  }>(`${BACKEND_URL}/api/weather/rainfall`);

  return {
    success: true,
    source: data.source,
    updatedAt: data.updatedAt,
    summary: data.summary,
    stations: data.stations,
    error: data.error,
  };
}
