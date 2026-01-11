-- =============================================
-- BADGES SYSTEM - SCHEMA & SEED DATA
-- =============================================
-- Creates badge catalog and user badge tracking tables
-- Implements badge awarding logic based on user activity

-- =============================================
-- 1. CREATE BADGES CATALOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_group TEXT NOT NULL CHECK (badge_group IN ('explorer', 'specialist', 'milestone', 'community')),
  category_key TEXT NULL,
  subcategory_key TEXT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'review_count',
    'category_count',
    'photo_count',
    'helpful_votes',
    'streak',
    'first_review',
    'same_business_twice',
    'suburb_count',
    'underrated_count',
    'photo_with_votes',
    'weekly_for_month',
    'category_coverage'
  )),
  threshold INTEGER NOT NULL,
  icon_path TEXT NOT NULL,
  meta JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_group ON public.badges(badge_group);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category_key) WHERE category_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_badges_rule_type ON public.badges(rule_type);

-- =============================================
-- 2. CREATE USER BADGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_awarded ON public.user_badges(awarded_at DESC);

-- =============================================
-- 3. SEED BADGE CATALOG - CATEGORY EXPLORER
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Category Explorer Badges
('explorer_sampler', 'The Sampler', 'Review one business in at least 3 different categories', 'explorer', NULL, NULL, 'category_count', 3, '/badges/011-compass.png'),
('explorer_explorer', 'The Explorer', 'Review 10 businesses across 5 different categories', 'explorer', NULL, NULL, 'category_coverage', 5, '/badges/011-compass.png'),
('explorer_local_legend', 'Local Legend', 'Review one business in every category', 'explorer', NULL, NULL, 'category_coverage', 8, '/badges/012-expertise.png'),
('explorer_world_wanderer', 'World Wanderer', 'Review more than one business in every category', 'explorer', NULL, NULL, 'category_coverage', 8, '/badges/026-earth-day.png'),
('explorer_full_spectrum', 'Full Spectrum', 'Review at least 50 businesses across 8+ categories', 'explorer', NULL, NULL, 'category_coverage', 8, '/badges/073-mosaic.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. SEED BADGE CATALOG - FOOD & DRINK SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Food & Drink
('food_taste_taster', 'Taste Taster', '3 Food & Drink reviews', 'specialist', 'food-drink', NULL, 'review_count', 3, '/badges/033-cake.png'),
('food_foodie_finder', 'Foodie Finder', '10 Food & Drink reviews', 'specialist', 'food-drink', NULL, 'review_count', 10, '/badges/042-restaurant.png'),
('food_foodie_boss', 'Foodie Boss', '25 Food & Drink reviews', 'specialist', 'food-drink', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Food & Drink Optional Extras
('food_coffee_lover', 'Coffee Lover', '5 café reviews', 'specialist', 'food-drink', 'cafes', 'review_count', 5, '/badges/034-coffee-cup.png'),
('food_sweet_tooth', 'Sweet Tooth Scout', '5 dessert place reviews', 'specialist', 'food-drink', 'desserts', 'review_count', 5, '/badges/033-cake.png'),
('food_brunch_enthusiast', 'Brunch Enthusiast', '5 brunch spot reviews', 'specialist', 'food-drink', 'brunch', 'review_count', 5, '/badges/042-restaurant.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. SEED BADGE CATALOG - BEAUTY & WELLNESS SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Beauty & Wellness
('beauty_glow_seeker', 'Glow Seeker', '3 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', NULL, 'review_count', 3, '/badges/020-magic-wand.png'),
('beauty_beauty_explorer', 'Beauty Explorer', '10 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', NULL, 'review_count', 10, '/badges/001-accessory.png'),
('beauty_style_star', 'Style Star', '25 Beauty & Wellness reviews', 'specialist', 'beauty-wellness', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Beauty & Wellness Optional Extras
('beauty_nail_enthusiast', 'Nail Enthusiast', '5 nail salon reviews', 'specialist', 'beauty-wellness', 'nail-salons', 'review_count', 5, '/badges/020-magic-wand.png'),
('beauty_style_whisperer', 'Style Whisperer', '5 hair salon reviews', 'specialist', 'beauty-wellness', 'hair-salons', 'review_count', 5, '/badges/017-scarf.png'),
('beauty_soft_life_guru', 'Soft Life Guru', '5 spa/wellness reviews', 'specialist', 'beauty-wellness', 'spas', 'review_count', 5, '/badges/018-peace.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. SEED BADGE CATALOG - ARTS & CULTURE SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Arts & Culture
('arts_culture_curious', 'Culture Curious', '3 Arts & Culture reviews', 'specialist', 'arts-culture', NULL, 'review_count', 3, '/badges/014-mask.png'),
('arts_art_explorer', 'Art Explorer', '10 Arts & Culture reviews', 'specialist', 'arts-culture', NULL, 'review_count', 10, '/badges/049-frames.png'),
('arts_culture_maven', 'Culture Maven', '25 Arts & Culture reviews', 'specialist', 'arts-culture', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Arts & Culture Optional Extras
('arts_theatre_friend', 'Theatre Friend', '5 theatre reviews', 'specialist', 'arts-culture', 'theatres', 'review_count', 5, '/badges/014-mask.png'),
('arts_gallery_goer', 'Gallery Goer', '5 gallery reviews', 'specialist', 'arts-culture', 'galleries', 'review_count', 5, '/badges/049-frames.png'),
('arts_cinephile', 'Cinephile', '5 cinema reviews', 'specialist', 'arts-culture', 'cinemas', 'review_count', 5, '/badges/063-director-chair.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 7. SEED BADGE CATALOG - OUTDOORS & ADVENTURE SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Outdoors & Adventure
('outdoors_fresh_air_friend', 'Fresh Air Friend', '3 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', NULL, 'review_count', 3, '/badges/060-mountains.png'),
('outdoors_adventure_explorer', 'Adventure Explorer', '10 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', NULL, 'review_count', 10, '/badges/062-tent.png'),
('outdoors_adventure_ace', 'Adventure Ace', '25 Outdoors & Adventure reviews', 'specialist', 'outdoors-adventure', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Outdoors & Adventure Optional Extras
('outdoors_trail_tracker', 'Trail Tracker', '5 hiking trail reviews', 'specialist', 'outdoors-adventure', 'hiking', 'review_count', 5, '/badges/060-mountains.png'),
('outdoors_beach_browser', 'Beach Browser', '5 beach reviews', 'specialist', 'outdoors-adventure', 'beaches', 'review_count', 5, '/badges/066-beach.png'),
('outdoors_nature_drifter', 'Nature Drifter', '5 park/garden reviews', 'specialist', 'outdoors-adventure', 'parks', 'review_count', 5, '/badges/069-tree.png'),
('outdoors_thrill_finder', 'Thrill Finder', '3 adventure/air sports reviews', 'specialist', 'outdoors-adventure', 'adventure-sports', 'review_count', 3, '/badges/062-tent.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 8. SEED BADGE CATALOG - SHOPPING & LIFESTYLE SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Shopping & Lifestyle
('shopping_shop_scout', 'Shop Scout', '3 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', NULL, 'review_count', 3, '/badges/003-money-bag.png'),
('shopping_lifestyle_explorer', 'Lifestyle Explorer', '10 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', NULL, 'review_count', 10, '/badges/052-shopping-bag.png'),
('shopping_retail_ranger', 'Retail Ranger', '25 Shopping & Lifestyle reviews', 'specialist', 'shopping-lifestyle', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Shopping & Lifestyle Optional Extras
('shopping_style_spotter', 'Style Spotter', '5 boutique reviews', 'specialist', 'shopping-lifestyle', 'boutiques', 'review_count', 5, '/badges/001-accessory.png'),
('shopping_gadget_grabber', 'Gadget Grabber', '5 electronics store reviews', 'specialist', 'shopping-lifestyle', 'electronics', 'review_count', 5, '/badges/058-plug.png'),
('shopping_budget_finder', 'Budget Finder', '3 discount/affordable store reviews', 'specialist', 'shopping-lifestyle', 'discount', 'review_count', 3, '/badges/003-money-bag.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 9. SEED BADGE CATALOG - FAMILY & PETS SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Family & Pets
('family_home_life_scout', 'Home Life Scout', '3 Family & Pets reviews', 'specialist', 'family-pets', NULL, 'review_count', 3, '/badges/007-home.png'),
('family_everyday_companion', 'Everyday Companion', '10 Family & Pets reviews', 'specialist', 'family-pets', NULL, 'review_count', 10, '/badges/009-mouse.png'),
('family_family_pets_pro', 'Family & Pets Pro', '25 Family & Pets reviews', 'specialist', 'family-pets', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Family & Pets Optional Extras
('family_care_companion', 'Care Companion', '5 vet/pet groomer/childcare reviews', 'specialist', 'family-pets', 'care-services', 'review_count', 5, '/badges/008-baby.png'),
('family_play_paws_explorer', 'Play & Paws Explorer', '5 family or pet-friendly spot reviews', 'specialist', 'family-pets', 'family-friendly', 'review_count', 5, '/badges/006-toy.png'),
('family_friendly_spaces', 'Friendly Spaces Finder', '5 kids/pets play area reviews', 'specialist', 'family-pets', 'play-areas', 'review_count', 5, '/badges/010-confetti.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 10. SEED BADGE CATALOG - EXPERIENCES & ENTERTAINMENT SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Experiences & Entertainment
('experiences_fun_finder', 'Fun Finder', '3 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', NULL, 'review_count', 3, '/badges/010-confetti.png'),
('experiences_event_explorer', 'Event Explorer', '10 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', NULL, 'review_count', 10, '/badges/005-social-life.png'),
('experiences_experience_pro', 'Experience Pro', '25 Experiences & Entertainment reviews', 'specialist', 'experiences-entertainment', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Experiences & Entertainment Optional Extras
('experiences_music_lover', 'Music Lover', '5 music venue reviews', 'specialist', 'experiences-entertainment', 'music-venues', 'review_count', 5, '/badges/013-vinyl.png'),
('experiences_show_goer', 'Show Goer', '5 cinema/theatre reviews', 'specialist', 'experiences-entertainment', 'shows', 'review_count', 5, '/badges/063-director-chair.png'),
('experiences_sunday_chiller', 'Sunday Chiller', '3 weekend/relaxation spot reviews', 'specialist', 'experiences-entertainment', 'relaxation', 'review_count', 3, '/badges/015-weekend.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 11. SEED BADGE CATALOG - PROFESSIONAL SERVICES SPECIALIST
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Professional Services
('services_service_scout', 'Service Scout', '3 Professional Services reviews', 'specialist', 'professional-services', NULL, 'review_count', 3, '/badges/019-professional-services.png'),
('services_local_helper', 'Local Helper', '10 Professional Services reviews', 'specialist', 'professional-services', NULL, 'review_count', 10, '/badges/019-professional-services.png'),
('services_service_pro', 'Service Pro', '25 Professional Services reviews', 'specialist', 'professional-services', NULL, 'review_count', 25, '/badges/048-award.png'),
-- Professional Services Optional Extras
('services_fix_it_finder', 'Fix-It Finder', '5 repair/handyman/electrician/plumber reviews', 'specialist', 'professional-services', 'repairs', 'review_count', 5, '/badges/016-wrench.png'),
('services_money_minded', 'Money-Minded', '5 finance/insurance reviews', 'specialist', 'professional-services', 'finance', 'review_count', 5, '/badges/003-money-bag.png'),
('services_home_helper', 'Home Helper', '5 home service reviews', 'specialist', 'professional-services', 'home-services', 'review_count', 5, '/badges/007-home.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 12. SEED BADGE CATALOG - MILESTONE BADGES
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Milestone Badges
('milestone_new_voice', 'New Voice', 'Posted your first review', 'milestone', NULL, NULL, 'review_count', 1, '/badges/027-megaphone.png'),
('milestone_rookie_reviewer', 'Rookie Reviewer', 'Posted 5 reviews', 'milestone', NULL, NULL, 'review_count', 5, '/badges/030-badge.png'),
('milestone_level_up', 'Level Up!', 'Posted 10 reviews', 'milestone', NULL, NULL, 'review_count', 10, '/badges/041-speedometer.png'),
('milestone_review_machine', 'Review Machine', 'Posted 50 reviews', 'milestone', NULL, NULL, 'review_count', 50, '/badges/044-rocket.png'),
('milestone_century_club', 'Century Club', 'Posted 100 reviews', 'milestone', NULL, NULL, 'review_count', 100, '/badges/048-award.png'),
('milestone_take_pic', 'Take a Pic!', 'Posted your first photo', 'milestone', NULL, NULL, 'photo_count', 1, '/badges/037-photo.png'),
('milestone_visual_storyteller', 'Visual Storyteller', 'Uploaded 15 photos', 'milestone', NULL, NULL, 'photo_count', 15, '/badges/049-frames.png'),
('milestone_helpful_reviewer', 'Helpful Reviewer', 'Got 10 helpful likes combined', 'milestone', NULL, NULL, 'helpful_votes', 10, '/badges/021-like.png'),
('milestone_consistency_star', 'Consistency Star', 'Posted a review weekly for a month', 'milestone', NULL, NULL, 'weekly_for_month', 4, '/badges/043-star.png'),
('milestone_streak_star', 'Streak Star', 'Posted a review 7 days in a row', 'milestone', NULL, NULL, 'streak', 7, '/badges/047-fire.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 13. SEED BADGE CATALOG - COMMUNITY BADGES
-- =============================================

INSERT INTO public.badges (id, name, description, badge_group, category_key, subcategory_key, rule_type, threshold, icon_path) VALUES
-- Community Badges
('community_early_bird', 'Early Bird', 'First to review a business', 'community', NULL, NULL, 'first_review', 1, '/badges/054-sun.png'),
('community_helper', 'Community Helper', 'One of your reviews got 5+ helpful votes', 'community', NULL, NULL, 'helpful_votes', 5, '/badges/021-like.png'),
('community_trend_starter', 'Trend Starter', 'Your review helped make a place trend', 'community', NULL, NULL, 'review_count', 1, '/badges/044-rocket.png'),
('community_discoverer', 'Discoverer', 'Reviewed 3 businesses with fewer than 3 existing reviews', 'community', NULL, NULL, 'underrated_count', 3, '/badges/011-compass.png'),
('community_loyal_one', 'The Loyal One', 'Reviewed the same business twice', 'community', NULL, NULL, 'same_business_twice', 2, '/badges/021-like.png'),
('community_neighbourhood_plug', 'Neighbourhood Plug', 'Reviewed 10+ places in one suburb', 'community', NULL, NULL, 'suburb_count', 10, '/badges/007-home.png'),
('community_hidden_gem', 'Hidden Gem Finder', 'Reviewed 5 underrated spots', 'community', NULL, NULL, 'underrated_count', 5, '/badges/002-goblin.png'),
('community_fun_storyteller', 'Fun Storyteller', 'Wrote reviews with photos that got 3+ helpful votes', 'community', NULL, NULL, 'photo_with_votes', 3, '/badges/049-frames.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 14. GRANT PERMISSIONS
-- =============================================

-- Allow authenticated users to read badges catalog
GRANT SELECT ON public.badges TO authenticated;

-- Allow authenticated users to read their own badges
GRANT SELECT ON public.user_badges TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
-- Badge system tables created and seeded with all badge definitions
-- Ready for badge awarding logic implementation
