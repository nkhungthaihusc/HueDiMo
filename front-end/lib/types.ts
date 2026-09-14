export type CategoryId =
  | "ancient"
  | "temple"
  | "spiritual"
  | "food"
  | "coffee"
  | "hotel"
  | "nature"
  | "beach"
  | "culture"
  | "cultural"
  | "craft_village"
  | "entertainment"
  | "shopping";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export interface MenuItem {
  name: string;
  price: number;
  isSignature?: boolean;
  description?: string;
}

export interface TicketTier {
  type: string;
  price: number;
  note?: string;
}

export interface HotelDetails {
  checkInTime?: string;
  checkOutTime?: string;
  priceRange?: string;
  roomTypes?: string[];
}

export interface Place {
  id: string;
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  rating: number;
  description: string;
  isLocal?: boolean;
  price?: number;
  images?: string[];
  imageUrl?: string;
  image_url?: string;
  address?: string;
  openingHours?: string;
  opening_hours?: string;
  duration?: string;
  bestTime?: string;
  best_time_to_visit?: string;
  highlights?: string[];
  notes?: string;
  status?: "pending" | "approved" | "rejected";
  created_by?: string;
  userId?: string;
  createdAt?: string;
  created_at?: string;
  // Đặc điểm chuyên biệt theo loại địa điểm
  menu?: MenuItem[];
  tickets?: TicketTier[];
  hotel?: HotelDetails;
  activities?: string[];
  specialtiesToBuy?: string[];
  amenities?: string[];
  dressCode?: string;
  rules?: string[];
  cuisineType?: string;
  priceRangeText?: string;
}

export interface Review {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatar_url?: string;
  role?: string;
  status?: string;
  provider?: string;
  points?: number;
  checkinCount?: number;
  checkin_count?: number;
}

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; user?: User; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; user?: User; error?: string }>;
  updateProfile: (data: { name?: string; avatarUrl?: string; avatar_url?: string }) => Promise<{ ok: boolean; user?: User; error?: string }>;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
}

