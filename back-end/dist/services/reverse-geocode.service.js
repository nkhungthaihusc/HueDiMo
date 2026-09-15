"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReverseGeocodeService = void 0;
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút
function formatNominatimAddress(data) {
    const addr = data.address || {};
    const fullAddress = data.display_name || "";
    // 1. Tên đường / số nhà hoặc địa danh
    const house = addr.house_number?.trim() || "";
    const road = (addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || "").trim();
    const landmark = (addr.tourism || addr.historic || addr.amenity || addr.building || "").trim();
    let streetPart = "";
    if (house && road) {
        streetPart = `${house} ${road}`;
    }
    else if (road) {
        streetPart = road;
    }
    else if (landmark) {
        streetPart = landmark;
    }
    // 2. Phường / Xã / Khu vực
    let wardPart = (addr.quarter || addr.suburb || addr.neighbourhood || addr.village || "").trim();
    if (wardPart.toLowerCase().startsWith("tổ dân phố")) {
        wardPart = "";
    }
    if (wardPart && !wardPart.startsWith("Phường") && !wardPart.startsWith("Xã") && !wardPart.startsWith("P.")) {
        wardPart = `P. ${wardPart}`;
    }
    // 3. Quận / Huyện / Thị xã / Thành phố
    let cityPart = (addr.city || addr.town || addr.county || addr.district || "").trim();
    if (cityPart.startsWith("Phường ") || cityPart.startsWith("Xã ")) {
        if (!wardPart) {
            wardPart = cityPart;
        }
        cityPart = "TP. Huế";
    }
    else if (!cityPart || cityPart.includes("Huế")) {
        cityPart = "TP. Huế";
    }
    // Ghép các thành phần địa chỉ
    const parts = [];
    if (streetPart)
        parts.push(streetPart);
    if (wardPart && !parts.includes(wardPart))
        parts.push(wardPart);
    if (cityPart && !parts.includes(cityPart))
        parts.push(cityPart);
    let formatted = parts.join(", ");
    if (!formatted) {
        formatted = fullAddress.split(",").slice(0, 3).join(", ").trim() || "Thành phố Huế";
    }
    return {
        address: formatted,
        road: streetPart || undefined,
        ward: wardPart || undefined,
        city: cityPart || "TP. Huế",
        fullAddress,
    };
}
class ReverseGeocodeService {
    static async reverse(lat, lng) {
        const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return {
                address: cached.address,
                road: cached.road,
                ward: cached.ward,
                city: cached.city,
                fullAddress: cached.fullAddress,
                source: cached.source,
                cached: true,
            };
        }
        // 1. Thử OpenStreetMap Nominatim
        try {
            const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi&addressdetails=1`;
            const res = await fetch(nominatimUrl, {
                headers: {
                    "User-Agent": "HueDiMo-App/1.0 (https://huedimo.vn; contact@huedimo.vn)",
                    Accept: "application/json",
                },
                signal: AbortSignal.timeout(4000),
            });
            if (res.ok) {
                const data = await res.json();
                const formatted = formatNominatimAddress(data);
                cache.set(cacheKey, {
                    ...formatted,
                    source: "nominatim",
                    timestamp: Date.now(),
                });
                return {
                    ...formatted,
                    source: "nominatim",
                    cached: false,
                };
            }
        }
        catch (err) {
            const reason = err?.cause?.code || err?.code || err?.message || "unknown";
            console.warn(`[ReverseGeocode] Nominatim lookup failed (${reason}), switching to BigDataCloud fallback.`);
        }
        // 2. Dự phòng BigDataCloud
        try {
            const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
            const res = await fetch(bdcUrl, {
                signal: AbortSignal.timeout(4000),
            });
            if (res.ok) {
                const data = await res.json();
                const parts = [];
                if (data.locality)
                    parts.push(`P. ${data.locality}`);
                if (data.city)
                    parts.push(data.city.includes("Huế") ? "TP. Huế" : data.city);
                else
                    parts.push("TP. Huế");
                const fallbackAddress = parts.join(", ") || "Thành phố Huế, Thừa Thiên Huế";
                cache.set(cacheKey, {
                    address: fallbackAddress,
                    ward: data.locality ? `P. ${data.locality}` : undefined,
                    city: "TP. Huế",
                    fullAddress: fallbackAddress,
                    source: "bigdatacloud",
                    timestamp: Date.now(),
                });
                return {
                    address: fallbackAddress,
                    ward: data.locality ? `P. ${data.locality}` : undefined,
                    city: "TP. Huế",
                    fullAddress: fallbackAddress,
                    source: "bigdatacloud",
                    cached: false,
                };
            }
        }
        catch (fallbackErr) {
            console.warn("[ReverseGeocode] BigDataCloud fallback failed:", fallbackErr);
        }
        // 3. Fallback toạ độ thuần
        const coordAddress = `${lat.toFixed(4)}°B, ${lng.toFixed(4)}°Đ, Huế`;
        return {
            address: coordAddress,
            city: "TP. Huế",
            fullAddress: coordAddress,
            source: "coordinates",
            cached: false,
        };
    }
}
exports.ReverseGeocodeService = ReverseGeocodeService;
