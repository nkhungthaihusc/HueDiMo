import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../config/db";

// Helper function to parse CSV line with quotes
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").replace(/^"|"$/g, ""));
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < headers.length) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || "").replace(/^"|"$/g, "").trim();
    });
    records.push(obj);
  }

  return records;
}

// Map Vietnamese name to clean slug
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Curated high quality photos by category / landmark
const CURATED_IMAGE_POOLS: Record<string, string[]> = {
  ancient: [
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1599818817658-005fa7572793?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  ],
  spiritual: [
    "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80",
  ],
  temple: [
    "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  ],
  food: [
    "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1200&q=80",
  ],
  coffee: [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80",
  ],
  hotel: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
  ],
  nature: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  ],
  culture: [
    "https://images.unsplash.com/photo-1599818817658-005fa7572793?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
  ],
  cultural: [
    "https://images.unsplash.com/photo-1599818817658-005fa7572793?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
  ],
  craft_village: [
    "https://images.unsplash.com/photo-1599818817658-005fa7572793?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
  ],
  shopping: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=1200&q=80",
  ],
};

// Explicit IDs to preserve backwards compatibility and reviews
const KNOWN_ID_MAP: Record<string, string> = {
  "Đại Nội Huế (Hoàng Thành)": "dai-noi",
  "Lăng Khải Định (Ứng Lăng)": "lang-co",
  "Lăng Tự Đức (Khiêm Lăng)": "lang-tu-duc",
  "Chùa Thiên Mụ": "chua-thien-mu",
  "Bún bò Huế Mụ Rơi": "bun-bo",
  "Cơm hến & Bún hến Hoa Đông": "com-hen",
  "Đồi Thiên An & Hồ Thủy Tiên": "phong-nha-nho",
  "Cầu Tràng Tiền & Phố đi bộ Nguyễn Đình Chiểu": "cau-truong-tien",
  "Nhà vườn An Hiên": "an-hien",
  "Silk Path Grand Hue Hotel": "khach-san",
};

async function main() {
  console.log("=== BẮT ĐẦU CHUYỂN ĐỔI DATA TỪ hue_places_standardized.csv VÀO DB ===");

  const standardizedPath = path.resolve(__dirname, "../../../hue_places_standardized.csv");
  const expandedPath = path.resolve(__dirname, "../../../hue_places_expanded.csv");
  const csvPath = fs.existsSync(standardizedPath) ? standardizedPath : expandedPath;

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Không tìm thấy file CSV: ${csvPath}`);
  }

  console.log(`Đang đọc dữ liệu từ: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rawRows = parseCSV(csvContent);
  console.log(`Đã đọc ${rawRows.length} dòng từ CSV.`);

  // Prepare places
  const usedIds = new Set<string>();
  const places: any[] = [];

  for (const row of rawRows) {
    const name = row["name"] || "";
    if (!name) continue;

    let id = KNOWN_ID_MAP[name];
    if (!id) {
      id = slugify(name);
      // Ensure uniqueness
      let suffix = 1;
      let uniqueId = id;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}-${suffix++}`;
      }
      id = uniqueId;
    }
    usedIds.add(id);

    const category = row["category"] || "culture";
    const lat = parseFloat(row["lat"]) || 16.4637;
    const lng = parseFloat(row["lng"]) || 107.5907;
    const address = row["address"] || "TP. Huế";
    const price = parseInt(row["price"] || "0", 10) || 0;
    const isLocal = row["is_local"]?.toLowerCase() === "true";
    const openingHours = row["opening_hours"] || "";
    const estimatedDuration = parseInt(row["estimated_duration_minutes"] || "60", 10) || 60;
    const BEST_TIME_VI_MAP: Record<string, string> = {
      morning: "Buổi sáng sớm (07:00 - 10:30)",
      afternoon: "Buổi chiều mát (14:30 - 17:00)",
      sunset: "Hoàng hôn chiều tà (16:30 - 18:00)",
      sunrise: "Bình minh sáng sớm (05:00 - 06:30)",
      evening: "Buổi tối lung linh (18:30 - 22:00)",
      all_day: "Cả ngày (bất kỳ thời điểm nào)",
    };
    const rawBestTime = (row["best_time_to_visit"] || "").trim().toLowerCase();
    const bestTime = BEST_TIME_VI_MAP[rawBestTime] || row["best_time_to_visit"] || "";
    const rating = parseFloat(row["rating"] || "4.5") || 4.5;
    const description = row["description"] || "";
    const highlights = (row["highlights"] || "")
      .split(";")
      .map((h) => h.trim())
      .filter(Boolean);
    const notes = row["notes"] || "";

    // Pick photos
    const categoryPool = CURATED_IMAGE_POOLS[category] || CURATED_IMAGE_POOLS["culture"];
    // Deterministic offset based on name length
    const offset = name.length % categoryPool.length;
    const images = [
      categoryPool[offset],
      categoryPool[(offset + 1) % categoryPool.length],
      categoryPool[(offset + 2) % categoryPool.length],
    ];
    const imageUrl = images[0];

    places.push({
      id,
      name,
      category,
      lat,
      lng,
      address,
      price,
      isLocal,
      openingHours,
      estimatedDuration,
      bestTime,
      rating,
      description,
      imageUrl,
      images,
      highlights,
      notes,
    });
  }

  console.log(`Đã chuẩn hóa ${places.length} địa điểm hoàn chỉnh.`);

  // 1. Clean old mock places from DB
  console.log("Xóa dữ liệu cũ trong bảng public.places...");
  await pool.query("DELETE FROM public.places");
  console.log("✅ Đã xóa toàn bộ dữ liệu cũ trong public.places.");

  // 2. Insert new places into DB
  console.log("Đang chèn 65 địa điểm mới vào database...");
  for (const p of places) {
    await pool.query(
      `INSERT INTO public.places (
        id, name, category, lat, lng, address, price, is_local,
        opening_hours, estimated_duration_minutes, best_time_to_visit,
        rating, description, image_url, images, highlights, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17
      )`,
      [
        p.id,
        p.name,
        p.category,
        p.lat,
        p.lng,
        p.address,
        p.price,
        p.isLocal,
        p.openingHours,
        p.estimatedDuration,
        p.bestTime,
        p.rating,
        p.description,
        p.imageUrl,
        p.images,
        p.highlights,
        p.notes,
      ]
    );
  }
  console.log("✅ Đã chèn thành công tất cả 65 địa điểm vào PostgreSQL Supabase!");

  // 3. Write out my-app/lib/data/places.ts
  const frontendPlacesPath = path.resolve(__dirname, "../../../my-app/lib/data/places.ts");
  const frontendContent = `import type { Place } from "@/lib/types";

export const PLACES: Place[] = ${JSON.stringify(
    places.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      rating: p.rating,
      description: p.description,
      price: p.price,
      isLocal: p.isLocal,
      address: p.address,
      openingHours: p.openingHours,
      duration: p.estimatedDuration + " phút",
      bestTime: p.bestTime,
      highlights: p.highlights,
      notes: p.notes,
      imageUrl: p.imageUrl,
      images: p.images,
    })),
    null,
    2
  )};

export const HUE_CENTER: { lat: number; lng: number } = { lat: 16.4637, lng: 107.5907 };

export const HUE_BOUNDS: [[number, number], [number, number]] = [
  [107.35, 16.15],
  [108.15, 16.65],
];
`;

  fs.writeFileSync(frontendPlacesPath, frontendContent, "utf-8");
  console.log(`✅ Đã đồng bộ ${places.length} địa điểm vào my-app/lib/data/places.ts.`);

  // 4. Verify count in DB
  const checkRes = await pool.query("SELECT COUNT(*)::int as count FROM public.places");
  console.log(`🎉 Tổng số địa điểm hiện có trong Database: ${checkRes.rows[0].count}`);

  await pool.end();
  console.log("=== HOÀN TẤT SEED DATA THÀNH CÔNG ===");
}

main().catch((err) => {
  console.error("Lỗi khi seed data:", err);
  process.exit(1);
});
