import { apiFetch } from "./client";
import type { VWaterApiResponse } from "@/lib/types/weather";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

/**
 * Lấy dữ liệu quan trắc mực nước sông Hương và các điểm cảnh báo ngập từ Backend API
 */
export async function fetchWaterLevelsData(): Promise<VWaterApiResponse> {
  // Backend trả về envelope { data: { count, timestamp, summary, stations } }
  const data = await apiFetch<{
    count: number;
    timestamp: string;
    summary: any;
    stations: any[];
  }>(`${BACKEND_URL}/api/water-levels`);

  return {
    success: true,
    count: data.count,
    timestamp: data.timestamp,
    summary: data.summary,
    stations: data.stations,
  };
}
