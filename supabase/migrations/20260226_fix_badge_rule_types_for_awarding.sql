-- Fix: Badges were set to rule_type='achievement' by 20260119, but award_badges_for_user
-- and check_user_badges only match specific rule_types. No badges were being awarded.
-- This migration restores rule_type and threshold so badges can be awarded on review/photo/helpful.

-- 1. Add NULL user_id guard in trigger (anonymous reviews have no user to award)
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_category_key TEXT;
  v_location TEXT;
  v_suburb TEXT;
  v_review_id UUID;
  v_event_data JSONB;
BEGIN
  IF TG_TABLE_NAME = 'reviews' THEN
    v_user_id := NEW.user_id;
    v_business_id := NEW.business_id;
    v_review_id := NEW.id;

    -- Skip badge awarding for anonymous reviews (no user to award)
    IF v_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT b.primary_category_slug, b.location INTO v_category_key, v_location
    FROM businesses b
    WHERE b.id = v_business_id;

    v_suburb := SPLIT_PART(COALESCE(v_location, ''), ',', 1);

    v_event_data := jsonb_build_object(
      'review_id', v_review_id,
      'business_id', v_business_id,
      'category_key', v_category_key,
      'suburb', v_suburb
    );

    PERFORM public.award_badges_for_user(v_user_id, 'review_created', v_event_data);

  ELSIF TG_TABLE_NAME = 'review_images' THEN
    SELECT r.user_id INTO v_user_id
    FROM reviews r
    WHERE r.id = NEW.review_id;

    IF v_user_id IS NOT NULL THEN
      v_event_data := jsonb_build_object('review_id', NEW.review_id);
      PERFORM public.award_badges_for_user(v_user_id, 'photo_added', v_event_data);
    END IF;

  ELSIF TG_TABLE_NAME = 'review_helpful_votes' THEN
    SELECT r.user_id INTO v_user_id
    FROM reviews r
    WHERE r.id = NEW.review_id;

    IF v_user_id IS NOT NULL THEN
      v_event_data := jsonb_build_object('review_id', NEW.review_id);
      PERFORM public.award_badges_for_user(v_user_id, 'helpful_vote_received', v_event_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update badges to use rule_types that award logic understands
-- Milestone: first review, 5, 10, 50, 100 reviews
UPDATE public.badges SET rule_type = 'review_count', threshold = 1
  WHERE id = 'milestone_new_voice' AND (rule_type IS DISTINCT FROM 'review_count' OR threshold IS DISTINCT FROM 1);
UPDATE public.badges SET rule_type = 'review_count', threshold = 5
  WHERE id = 'milestone_rookie_reviewer' AND (rule_type IS DISTINCT FROM 'review_count' OR threshold IS DISTINCT FROM 5);
UPDATE public.badges SET rule_type = 'review_count', threshold = 10
  WHERE id = 'milestone_level_up' AND (rule_type IS DISTINCT FROM 'review_count' OR threshold IS DISTINCT FROM 10);
UPDATE public.badges SET rule_type = 'review_count', threshold = 50
  WHERE id = 'milestone_review_machine' AND (rule_type IS DISTINCT FROM 'review_count' OR threshold IS DISTINCT FROM 50);
UPDATE public.badges SET rule_type = 'review_count', threshold = 100
  WHERE id = 'milestone_century_club' AND (rule_type IS DISTINCT FROM 'review_count' OR threshold IS DISTINCT FROM 100);

-- Milestone: photos
UPDATE public.badges SET rule_type = 'photo_count', threshold = 1
  WHERE id = 'milestone_picture_pioneer' AND (rule_type IS DISTINCT FROM 'photo_count' OR threshold IS DISTINCT FROM 1);
UPDATE public.badges SET rule_type = 'photo_count', threshold = 15
  WHERE id = 'milestone_snapshot_superstar' AND (rule_type IS DISTINCT FROM 'photo_count' OR threshold IS DISTINCT FROM 15);

-- Milestone: helpful votes
UPDATE public.badges SET rule_type = 'helpful_votes_received', threshold = 10
  WHERE id = 'milestone_helpful_honeybee' AND (rule_type IS DISTINCT FROM 'helpful_votes_received' OR threshold IS DISTINCT FROM 10);

-- Explorer: distinct categories (3, 5, 6, 7, 8)
UPDATE public.badges SET rule_type = 'distinct_category_count', threshold = 3
  WHERE id = 'explorer_dabbler' AND (rule_type IS DISTINCT FROM 'distinct_category_count' OR threshold IS DISTINCT FROM 3);
UPDATE public.badges SET rule_type = 'distinct_category_count', threshold = 5
  WHERE id = 'explorer_newbie_nomad' AND (rule_type IS DISTINCT FROM 'distinct_category_count' OR threshold IS DISTINCT FROM 5);
UPDATE public.badges SET rule_type = 'distinct_category_count', threshold = 6
  WHERE id = 'explorer_curiosity_captain' AND (rule_type IS DISTINCT FROM 'distinct_category_count' OR threshold IS DISTINCT FROM 6);
UPDATE public.badges SET rule_type = 'distinct_category_count', threshold = 7
  WHERE id = 'explorer_variety_voyager' AND (rule_type IS DISTINCT FROM 'distinct_category_count' OR threshold IS DISTINCT FROM 7);
UPDATE public.badges SET rule_type = 'distinct_category_count', threshold = 8
  WHERE id = 'explorer_full_circle' AND (rule_type IS DISTINCT FROM 'distinct_category_count' OR threshold IS DISTINCT FROM 8);

-- Community: Early Bird (first review for a business) - no threshold
UPDATE public.badges SET rule_type = 'first_review_for_business', threshold = NULL
  WHERE id IN ('community_early_bird', 'early_bird') AND rule_type IS DISTINCT FROM 'first_review_for_business';

-- Community: Discoverer (review business with <3 reviews)
UPDATE public.badges SET rule_type = 'review_low_review_business_count', threshold = 3
  WHERE id IN ('community_discoverer', 'discoverer') AND (rule_type IS DISTINCT FROM 'review_low_review_business_count' OR threshold IS DISTINCT FROM 3);

-- Specialist badges: category_review_count (3, 10, 25 or 5 for subcategories)
-- Food & Drink
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id = 'specialist_food_taste_tester' AND category_key = 'food-drink';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_food_flavour_finder' AND category_key = 'food-drink';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_food_foodie_boss' AND category_key = 'food-drink';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_food_coffee_connoisseur', 'specialist_food_dessert_detective', 'specialist_food_brunch_enthusiast') AND category_key = 'food-drink';
-- Beauty & Wellness
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id = 'specialist_beauty_glow_getter' AND category_key = 'beauty-wellness';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_beauty_self_care_superstar' AND category_key = 'beauty-wellness';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_beauty_beauty_boss' AND category_key = 'beauty-wellness';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_beauty_cuticle_queen', 'specialist_beauty_mane_lover', 'specialist_beauty_serenity_seeker') AND category_key = 'beauty-wellness';
-- Arts & Culture
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id = 'specialist_arts_heritage_hunter' AND category_key = 'arts-culture';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_arts_art_explorer' AND category_key = 'arts-culture';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_arts_culture_maven' AND category_key = 'arts-culture';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_arts_theatre_friend', 'specialist_arts_gallery_goer', 'specialist_arts_cinephile') AND category_key = 'arts-culture';
-- Outdoors & Adventure
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id IN ('specialist_outdoors_fresh_air_friend', 'specialist_outdoors_thrill_finder') AND category_key = 'outdoors-adventure';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_outdoors_adventure_explorer' AND category_key = 'outdoors-adventure';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_outdoors_adventure_ace' AND category_key = 'outdoors-adventure';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_outdoors_trail_tracker', 'specialist_outdoors_beach_browser', 'specialist_outdoors_nature_drifter') AND category_key = 'outdoors-adventure';
-- Shopping & Lifestyle
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id IN ('specialist_shopping_shop_scout', 'specialist_shopping_budget_finder') AND category_key = 'shopping-lifestyle';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_shopping_lifestyle_explorer' AND category_key = 'shopping-lifestyle';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_shopping_retail_ranger' AND category_key = 'shopping-lifestyle';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_shopping_style_spotter', 'specialist_shopping_gadget_grabber') AND category_key = 'shopping-lifestyle';
-- Family & Pets
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id = 'specialist_family_home_life_scout' AND category_key = 'family-pets';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_family_everyday_companion' AND category_key = 'family-pets';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_family_family_pets_pro' AND category_key = 'family-pets';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_family_care_companion', 'specialist_family_play_paws_explorer', 'specialist_family_friendly_spaces') AND category_key = 'family-pets';
-- Experiences & Entertainment
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id IN ('specialist_experiences_memory_maker', 'specialist_experiences_weekend_warrior') AND category_key = 'experiences-entertainment';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_experiences_curiosity_cruiser' AND category_key = 'experiences-entertainment';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_experiences_vibe_voyager' AND category_key = 'experiences-entertainment';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_experiences_beat_chaser', 'specialist_experiences_show_goer') AND category_key = 'experiences-entertainment';
-- Professional Services
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 3 WHERE id = 'specialist_services_service_scout' AND category_key = 'professional-services';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 10 WHERE id = 'specialist_services_solution_seeker' AND category_key = 'professional-services';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 25 WHERE id = 'specialist_services_service_pro' AND category_key = 'professional-services';
UPDATE public.badges SET rule_type = 'category_review_count', threshold = 5 WHERE id IN ('specialist_services_fix_it_fairy', 'specialist_services_money_minded', 'specialist_services_home_helper') AND category_key = 'professional-services';

-- 3. Extend check_user_badges to include category_review_count (used by check-and-award API)
CREATE OR REPLACE FUNCTION public.check_user_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id TEXT, badge_name TEXT) AS $$
DECLARE
  v_review_count INTEGER;
  v_photo_count INTEGER;
  v_helpful_votes_received INTEGER;
  v_helpful_votes_total INTEGER;
  v_distinct_categories INTEGER;
  v_badge_record RECORD;
  v_cat_review_count INTEGER;
BEGIN
  SELECT 
    COUNT(DISTINCT r.id)::INTEGER,
    COUNT(DISTINCT ri.id)::INTEGER,
    COALESCE(SUM(r.helpful_count), 0)::INTEGER,
    COALESCE((SELECT COUNT(*)::INTEGER FROM review_helpful_votes rhv 
              INNER JOIN reviews r2 ON r2.id = rhv.review_id 
              WHERE r2.user_id = p_user_id), 0),
    COUNT(DISTINCT b.primary_category_slug)::INTEGER
  INTO 
    v_review_count,
    v_photo_count,
    v_helpful_votes_received,
    v_helpful_votes_total,
    v_distinct_categories
  FROM reviews r
  LEFT JOIN review_images ri ON ri.review_id = r.id
  LEFT JOIN businesses b ON b.id = r.business_id
  WHERE r.user_id = p_user_id;

  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE (
      (rule_type = 'review_count' AND threshold IS NOT NULL AND v_review_count >= threshold)
      OR
      (rule_type = 'photo_count' AND threshold IS NOT NULL AND v_photo_count >= threshold)
      OR
      (rule_type = 'helpful_votes_received' AND threshold IS NOT NULL AND v_helpful_votes_received >= threshold)
      OR
      (rule_type = 'helpful_votes_total' AND threshold IS NOT NULL AND v_helpful_votes_total >= threshold)
      OR
      (rule_type = 'distinct_category_count' AND threshold IS NOT NULL AND v_distinct_categories >= threshold)
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  -- Category specialist badges: check each badge with category_review_count
  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE rule_type = 'category_review_count' 
      AND category_key IS NOT NULL 
      AND threshold IS NOT NULL
  LOOP
    SELECT COUNT(*)::INTEGER INTO v_cat_review_count
    FROM reviews rr
    INNER JOIN businesses bb ON bb.id = rr.business_id
    WHERE rr.user_id = p_user_id AND bb.primary_category_slug = v_badge_record.category_key;

    IF v_cat_review_count >= v_badge_record.threshold AND NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_and_award_badges IS 'Trigger: award badges on review/photo/helpful_vote. Skips anonymous reviews.';
COMMENT ON FUNCTION public.check_user_badges IS 'Manually check and award badges; includes category_review_count for specialists.';
