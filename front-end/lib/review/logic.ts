import type { Review } from "@/lib/types";
import { SEED_REVIEWS } from "@/lib/data/reviews";

const REVIEWS_KEY = "huedimo_reviews";

function readStored(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) ?? "[]") as Review[];
  } catch {
    return [];
  }
}

export function getReviews(placeId: string): Review[] {
  const stored = readStored();
  const local = stored.filter((r) => r.placeId === placeId);
  const seeds = SEED_REVIEWS.filter((r) => r.placeId === placeId);
  return [...local, ...seeds];
}

export function addReview(input: {
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Review {
  const review: Review = {
    id: `rv-${Date.now()}`,
    placeId: input.placeId,
    authorName: input.authorName,
    rating: input.rating,
    comment: input.comment,
    createdAt: new Date().toISOString(),
  };
  const stored = readStored();
  stored.push(review);
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(stored));
  return review;
}

export function averageRating(placeId: string): number | null {
  const reviews = getReviews(placeId);
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}