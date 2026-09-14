import type { Category } from "@/lib/types";

export const CATEGORIES: Category[] = [
  { id: "ancient", label: "Di tích cổ", emoji: "🏛️", color: "#8b5cf6" },
  { id: "spiritual", label: "Chùa & Tâm linh", emoji: "🛕", color: "#d946ef" },
  { id: "food", label: "Ẩm thực", emoji: "🍜", color: "#f97316" },
  { id: "coffee", label: "Cà phê & Trà", emoji: "☕", color: "#b45309" },
  { id: "hotel", label: "Khách sạn", emoji: "🏨", color: "#06b6d4" },
  { id: "nature", label: "Thiên nhiên", emoji: "🌿", color: "#22c55e" },
  { id: "beach", label: "Bãi biển", emoji: "🏖️", color: "#0284c7" },
  { id: "cultural", label: "Văn hóa & Di sản", emoji: "🎨", color: "#eab308" },
  { id: "craft_village", label: "Làng nghề", emoji: "🏮", color: "#ec4899" },
  { id: "entertainment", label: "Giải trí & Phố đêm", emoji: "🎭", color: "#6366f1" },
  { id: "shopping", label: "Chợ & Mua sắm", emoji: "🛍️", color: "#14b8a6" },
];

const ALIAS_MAP: Record<string, string> = {
  temple: "spiritual",
  culture: "cultural",
};

export const getCategory = (id: string): Category => {
  const targetId = ALIAS_MAP[id] || id;
  return CATEGORIES.find((c) => c.id === targetId) ?? CATEGORIES[0];
};
