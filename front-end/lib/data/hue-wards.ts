export interface HueWard {
  type: "Feature";
  id: string;
  bbox?: [number, number, number, number];
  properties: { code: string; name: string };
  geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
}
export interface HueWards {
  type: "FeatureCollection";
  features: HueWard[];
}

function ringContains(ring: number[][], lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1];
    const [x2, y2] = ring[i];
    const cross = (lng - x1) * (y2 - y1) - (lat - y1) * (x2 - x1);
    if (Math.abs(cross) < 1e-12 && lng >= Math.min(x1, x2) && lng <= Math.max(x1, x2) &&
        lat >= Math.min(y1, y2) && lat <= Math.max(y1, y2)) return true;
    if ((y1 > lat) !== (y2 > lat) && lng < x1 + (lat - y1) * (x2 - x1) / (y2 - y1)) inside = !inside;
  }
  return inside;
}

export function wardContains(ward: HueWard, { lat, lng }: { lat: number; lng: number }): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const [west, south, east, north] = ward.bbox ?? wardBounds(ward).flat();
  if (lng < west || lng > east || lat < south || lat > north) return false;
  const polygons = ward.geometry.type === "Polygon" ? [ward.geometry.coordinates] : ward.geometry.coordinates;
  return polygons.some(([outer, ...holes]) =>
    ringContains(outer, lat, lng) && !holes.some((hole) => ringContains(hole, lat, lng))
  );
}

export function wardBounds(ward: HueWard): [[number, number], [number, number]] {
  if (ward.bbox) return [[ward.bbox[0], ward.bbox[1]], [ward.bbox[2], ward.bbox[3]]];
  const polygons = ward.geometry.type === "Polygon" ? [ward.geometry.coordinates] : ward.geometry.coordinates;
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const polygon of polygons) {
    for (const [lng, lat] of polygon[0]) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return [[west, south], [east, north]];
}
