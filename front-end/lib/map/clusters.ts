export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface PlaceCluster<T extends MapPoint> {
  places: T[];
  lat: number;
  lng: number;
}

// Group nearby points in screen pixels. At zoom 15 each destination is shown.
export function clusterPlaces<T extends MapPoint>(
  places: T[], zoom: number, separateIds: Set<string> = new Set(),
): PlaceCluster<T>[] {
  const groups: (PlaceCluster<T> & { x: number; y: number })[] = [];
  const worldSize = 512 * 2 ** zoom;
  const uniquePlaces = [...new Map(places.map((place) => [place.id, place])).values()];
  for (const place of uniquePlaces.sort((a, b) => a.id.localeCompare(b.id))) {
    const sinLat = Math.sin(place.lat * Math.PI / 180);
    const x = (place.lng + 180) / 360 * worldSize;
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
    const group = zoom < 15 && !separateIds.has(place.id)
      ? groups.find((candidate) => !separateIds.has(candidate.places[0].id) &&
          Math.hypot(candidate.x - x, candidate.y - y) < 60)
      : undefined;
    if (!group) {
      groups.push({ places: [place], lat: place.lat, lng: place.lng, x, y });
      continue;
    }
    const count = group.places.length;
    group.lat = (group.lat * count + place.lat) / (count + 1);
    group.lng = (group.lng * count + place.lng) / (count + 1);
    group.x = (group.x * count + x) / (count + 1);
    group.y = (group.y * count + y) / (count + 1);
    group.places.push(place);
  }
  return groups;
}

export function layoutMarkerOffsets(points: MapPoint[], zoom: number): Map<string, { x: number; y: number }> {
  const offsets = new Map<string, { x: number; y: number }>();
  const occupied: { x: number; y: number }[] = [];
  const worldSize = 512 * 2 ** zoom;
  const horizontalGap = zoom >= 15 ? 144 : 52;
  const verticalGap = zoom >= 15 ? 76 : 52;
  const directions = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const sinLat = Math.sin(point.lat * Math.PI / 180);
    const x = (point.lng + 180) / 360 * worldSize;
    const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
    const isFree = (dx: number, dy: number) => !occupied.some((position) =>
      Math.abs(position.x - x - dx) < horizontalGap && Math.abs(position.y - y - dy) < verticalGap
    );
    let offset = { x: 0, y: 0 };
    if (!isFree(0, 0)) {
      search: for (let ring = 1; ring <= points.length; ring++) {
        for (const [dx, dy] of directions) {
          const candidate = { x: dx * horizontalGap * ring, y: dy * verticalGap * ring };
          if (isFree(candidate.x, candidate.y)) {
            offset = candidate;
            break search;
          }
        }
      }
    }
    offsets.set(point.id, offset);
    occupied.push({ x: x + offset.x, y: y + offset.y });
  }
  return offsets;
}
