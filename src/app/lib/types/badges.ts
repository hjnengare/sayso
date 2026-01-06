/**
 * Badge System Type Definitions
 * Based on the Badge Notes 26 November specification
 */

export type BadgeGroup = 'milestone' | 'category_explorer' | 'category_specialist' | 'community' | 'personality';

export type BadgeRuleType =
  | 'review_count'
  | 'category_review_count'
  | 'distinct_category_count'
  | 'photo_count'
  | 'helpful_votes_total'
  | 'helpful_votes_received'
  | 'first_review_for_business'
  | 'review_low_review_business_count'
  | 'distinct_businesses_in_suburb'
  | 'streak_days'
  | 'weekly_streak'
  | 'loyal_reviewer';

export interface Badge {
  id: string;
  name: string;
  description: string;
  badge_group: BadgeGroup;
  category_key: string | null;
  rule_type: BadgeRuleType;
  threshold: number | null;
  meta: Record<string, any>;
  icon_name: string | null;
  created_at: string;
}

export interface UserBadge {
  badge_id: string;
  badge_name: string;
  badge_description: string;
  badge_group: BadgeGroup;
  category_key: string | null;
  icon_name: string | null;
  awarded_at: string;
}

export interface BadgeProgress {
  badge_id: string;
  badge_name: string;
  badge_description: string;
  badge_group: BadgeGroup;
  progress: number;
  target: number;
  percentage_complete: number;
  is_earned: boolean;
}

export interface BadgeStats {
  total_badges: number;
  badges_by_group: Record<BadgeGroup, number>;
  recent_badges: Array<{
    id: string;
    name: string;
    description: string;
    badge_group: BadgeGroup;
    awarded_at: string;
  }>;
}

export interface BadgesResponse {
  badges: UserBadge[];
  progress?: BadgeProgress[];
  stats?: BadgeStats;
}

