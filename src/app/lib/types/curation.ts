/**
 * Types for the curated businesses algorithm
 */

export interface CuratedBusiness {
  id: string;
  name: string;
  image_url: string;
  category: string;
  sub_interest_id: string | null;
  interest_id: string | null;
  description: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  average_rating: number;
  total_reviews: number;
  verified: boolean;
  owner_verified: boolean;
  slug: string | null;
  last_activity_at: string | null;
  created_at: string;
  curation_score: number;
  is_top3: boolean;
  rank_position: number;
}

export interface CuratedBusinessesResponse {
  top3: CuratedBusiness[];
  next10: CuratedBusiness[];
  interest_id: string | null;
  total_count: number;
}

export interface CuratedBusinessesParams {
  interest_id?: string | null;
  limit?: number;
  user_lat?: number | null;
  user_lng?: number | null;
}

/**
 * Transformed business for UI consumption
 */
export interface CuratedBusinessUI {
  id: string;
  name: string;
  image: string;
  alt: string;
  category: string;
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  totalRating: number;
  reviews: number;
  badge: "featured" | "top3" | "curated";
  rank: number;
  href: string;
  monthAchievement: string;
  verified: boolean;
  isTop3: boolean;
  curationScore: number;
}

export interface CuratedBusinessesUIResponse {
  top3: CuratedBusinessUI[];
  next10: CuratedBusinessUI[];
  interestId: string | null;
  totalCount: number;
}
