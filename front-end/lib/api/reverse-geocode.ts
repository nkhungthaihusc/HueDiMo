import { apiFetch } from "./client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface ReverseGeocodeData {
  address: string;
  road?: string;
  ward?: string;
  city?: string;
  fullAddress: string;
  source: string;
  cached: boolean;
}

/**
 * Chuyển đổi toạ độ GPS (lat, lng) sang địa chỉ tại Huế qua Backend API
 */
export async function getReverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeData> {
  return apiFetch<ReverseGeocodeData>(
    `${BACKEND_URL}/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
  );
}
