import { CATEGORIES } from "../data/categories";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : {};
}

function firstText(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === "string" && value.trim() !== "")?.trim() ?? "";
}

function coordinate(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
}

export function parsePlaceJson(text: string, defaultCategory: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("Tệp JSON hoặc GeoJSON sai cú pháp.");
  }

  const root = record(parsed);
  const entries = Array.isArray(parsed) ? parsed
    : root.type === "FeatureCollection" ? root.features
    : Array.isArray(root.places) ? root.places
    : Array.isArray(root.results) ? root.results
    : root.type === "Feature" || root.name || root.title || root.Location ? [root]
    : null;
  if (!Array.isArray(entries)) {
    throw new Error("Chọn tệp GeoJSON có các điểm hoặc tệp JSON chứa danh sách địa điểm.");
  }

  return entries.map((entry) => {
    const item = record(entry);
    const feature = item.type === "Feature";
    const properties = feature ? record(item.properties) : item;
    const geometry = record(item.geometry);
    const location = record(properties.Location ?? properties.location ?? geometry.location);
    const geo = record(location["Geo Coordinates"]);
    const point = geometry.type === "Point" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : [];
    const unsupportedGeometry = feature && geometry.type != null && geometry.type !== "Point";
    const name = firstText(properties.name, properties.Name, properties.title, properties.Title, properties.label,
      record(properties.displayName).text, location["Business Name"], location.name);
    const category = firstText(properties.category);
    const lat = coordinate(point[1], properties.lat, properties.latitude, location.lat, location.latitude, geo.Latitude);
    const lng = coordinate(point[0], properties.lng, properties.longitude, location.lng, location.longitude, geo.Longitude);

    return {
      name,
      category: CATEGORIES.some(({ id }) => id === category) ? category : defaultCategory,
      lat: unsupportedGeometry ? null : lat ?? null,
      lng: unsupportedGeometry ? null : lng ?? null,
      address: firstText(properties.address, properties.Address, properties.formattedAddress,
        properties.formatted_address, location.Address, location.address),
      description: firstText(properties.description, properties.Description),
      notes: firstText(properties.notes, properties.Note, properties.comment),
      image_url: firstText(properties.image_url, properties.imageUrl),
      rating: coordinate(properties.rating),
    };
  });
}
