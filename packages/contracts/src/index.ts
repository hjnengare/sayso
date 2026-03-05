export interface ApiErrorDto {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: ApiErrorDto | null;
}

export interface MobileSessionProfileDto {
  id: string;
  role?: 'user' | 'business_owner' | 'admin' | 'both';
  account_role?: 'user' | 'business_owner' | 'admin';
  username?: string;
  display_name?: string;
  avatar_url?: string;
  onboarding_step?: string;
  onboarding_complete?: boolean;
}

export interface MobileSessionUserDto {
  id: string;
  email: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  profile?: MobileSessionProfileDto;
}

export interface BusinessPercentilesDto {
  punctuality?: number;
  'cost-effectiveness'?: number;
  friendliness?: number;
  trustworthiness?: number;
}

export interface BusinessListItemDto {
  id: string;
  name: string;
  image?: string | null;
  image_url?: string | null;
  uploaded_images?: string[];
  alt?: string;
  category?: string;
  category_label?: string;
  sub_interest_id?: string;
  subInterestId?: string;
  subInterestLabel?: string;
  interest_id?: string;
  interestId?: string;
  location?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  slug?: string;
  rating?: number;
  totalRating?: number;
  reviews?: number;
  badge?: string;
  priceRange?: string;
  hasRating?: boolean;
  distance?: number | string;
  lat?: number | null;
  lng?: number | null;
  percentiles?: BusinessPercentilesDto;
  verified?: boolean;
  href?: string;
}

export interface BusinessSearchResponseDto {
  success: boolean;
  businesses: BusinessListItemDto[];
  count: number;
}

export interface PaginatedBusinessFeedResponseDto {
  items: BusinessListItemDto[];
  nextCursor: string | null;
  businesses?: BusinessListItemDto[];
  cursorId?: string | null;
  meta?: Record<string, unknown>;
}

export interface UserPreferenceDto {
  id: string;
  name: string;
}

export interface UserPreferencesResponseDto {
  interests: UserPreferenceDto[];
  subcategories: UserPreferenceDto[];
  dealbreakers: UserPreferenceDto[];
}

export interface FeaturedBusinessDto extends BusinessListItemDto {
  alt?: string;
  category: string;
  description: string;
  reviewCount: number;
  totalRating?: number;
  badge: 'featured';
  rank: number;
  monthAchievement: string;
  verified: boolean;
  ui_hints?: {
    badge?: 'featured';
    rank?: number;
    period?: string;
    reason?: {
      label: string;
      metric?: string;
      value?: number;
    };
  };
  featured_score?: number;
  recent_reviews_30d?: number;
  recent_reviews_7d?: number;
  bayesian_rating?: number | null;
  lat?: number | null;
  lng?: number | null;
  top_review_preview?: {
    content: string;
    rating?: number | null;
    createdAt?: string | null;
  } | null;
}

export interface FeaturedBusinessesResponseDto {
  data?: FeaturedBusinessDto[];
  businesses?: FeaturedBusinessDto[];
  meta?: {
    period?: string;
    generated_at?: string;
    seed?: string;
    source?: 'cold_start' | 'rpc' | 'fallback';
    count?: number;
  } | null;
}

export interface TopReviewerDto {
  id: string;
  name: string;
  username?: string;
  profilePicture: string;
  reviewCount: number;
  rating: number;
  avgRatingGiven?: number | null;
  helpfulVotes?: number;
  badge?: 'top' | 'verified' | 'local';
  trophyBadge?: 'gold' | 'silver' | 'bronze' | 'rising-star' | 'community-favorite';
  badgesCount?: number;
  location: string;
}

export interface TopReviewersResponseDto {
  reviewers: TopReviewerDto[];
  mode: 'stage1' | 'normal';
}

export interface RecentReviewDto {
  id: string;
  reviewer: TopReviewerDto;
  businessName: string;
  businessType: string;
  businessId?: string;
  rating: number;
  reviewText: string;
  date: string;
  likes: number;
  tags?: string[];
  images?: string[];
}

export interface RecentReviewsResponseDto {
  reviews: RecentReviewDto[];
}

export interface EventSpecialListItemDto {
  id: string;
  title: string;
  type: 'event' | 'special';
  image?: string | null;
  image_url?: string | null;
  uploaded_images?: string[];
  heroImage?: string | null;
  bannerImage?: string | null;
  businessImages?: string[];
  alt?: string;
  icon?: string;
  location: string;
  rating?: number | null;
  reviews?: number;
  totalReviews?: number;
  startDate: string;
  endDate?: string;
  startDateISO?: string;
  endDateISO?: string;
  occurrences?: EventOccurrenceDto[];
  occurrencesCount?: number;
  date_range_label?: string | null;
  price?: string | null;
  description?: string;
  bookingUrl?: string;
  bookingContact?: string;
  ctaSource?: 'website' | 'whatsapp' | 'quicket' | 'webtickets' | 'other' | null;
  whatsappNumber?: string;
  whatsappPrefillTemplate?: string;
  href?: string;
  businessId?: string;
  businessName?: string;
  venueName?: string;
  city?: string;
  country?: string;
  source?: string;
  isCommunityEvent?: boolean;
  isExternalEvent?: boolean;
  availabilityStatus?: 'sold_out' | 'limited' | null;
}

export interface EventOccurrenceDto {
  startDate: string;
  endDate?: string;
  bookingUrl?: string;
}

export interface EventsAndSpecialsResponseDto {
  items: EventSpecialListItemDto[];
  count: number;
  nextCursor?: string | null;
  limit?: number;
  offset?: number;
}

export interface SavedBusinessDto extends BusinessListItemDto {
  savedAt?: string;
}

export interface SavedBusinessesResponseDto {
  success: boolean;
  businesses: SavedBusinessDto[];
  count: number;
}

export interface NotificationDto {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  image?: string | null;
  image_alt?: string | null;
  read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface NotificationsResponseDto {
  notifications: NotificationDto[];
  count: number;
  unreadCount?: number;
}

export interface RegisterPushTokenRequestDto {
  expoPushToken: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  appVersion?: string;
}

export interface DeletePushTokenRequestDto {
  expoPushToken?: string;
  deviceId?: string;
}

export interface PushTokenDto {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
  device_id?: string | null;
  app_version?: string | null;
  last_seen_at: string;
  disabled_at?: string | null;
}

export interface RegisterPushTokenResponseDto {
  success: boolean;
  token: PushTokenDto;
}

export interface PushDispatchSummaryDto {
  tokens: number;
  notifications: number;
  attempted: number;
  sent: number;
  failed: number;
  invalidTokens: number;
}
