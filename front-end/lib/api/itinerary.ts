import { apiFetch } from "./client";
import type { Itinerary, ItineraryRequest } from "@/lib/itinerary/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

/**
 * Gửi yêu cầu lập lịch trình du lịch thông minh bằng AI qua Backend API
 */
export async function createItinerary(request: ItineraryRequest): Promise<Itinerary> {
  return apiFetch<Itinerary>(`${BACKEND_URL}/api/itinerary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
}
