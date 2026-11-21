import data from "./hue-boundary.json";

export const hueBoundary = data as [number, number][];
const west = Math.min(...hueBoundary.map(([lng]) => lng));
const east = Math.max(...hueBoundary.map(([lng]) => lng));
const south = Math.min(...hueBoundary.map(([, lat]) => lat));
const north = Math.max(...hueBoundary.map(([, lat]) => lat));
export const hueBounds: [[number, number], [number, number]] = [[west, south], [east, north]];

export function isInHue({ lat, lng }: { lat: number; lng: number }): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lng < west || lng > east || lat < south || lat > north) return false;

  let inside = false;
  for (let i = 1; i < hueBoundary.length; i++) {
    const [x1, y1] = hueBoundary[i - 1];
    const [x2, y2] = hueBoundary[i];
    const cross = (lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-12 && lng >= Math.min(x1, x2) && lng <= Math.max(x1, x2) &&
        lat >= Math.min(y1, y2) && lat <= Math.max(y1, y2)) return true;
    if ((y1 > lat) !== (y2 > lat) && lng < x1 + (lat - y1) * (x2 - x1) / (y2 - y1)) inside = !inside;
  }
  return inside;
}

export const outsideHuePlaceMessage = "Địa điểm này nằm ngoài thành phố Huế. Bản đồ vẫn hiển thị Huế.";
