-- Fix Badge System Triggers
-- This ensures badges are automatically awarded when reviews are created

-- First, check if triggers exist
DO $$
BEGIN
    -- Check if the trigger exists on reviews table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_reviews_badge_check' 
        AND tgrelid = 'public.reviews'::regclass
    ) THEN
        -- Create trigger for reviews
        CREATE TRIGGER trigger_reviews_badge_check
            AFTER INSERT ON public.reviews
            FOR EACH ROW
            EXECUTE FUNCTION public.check_and_award_badges();
        
        RAISE NOTICE 'Created reviews badge trigger';
    ELSE
        RAISE NOTICE 'Reviews badge trigger already exists';
    END IF;

    -- Check if the trigger exists on review_images table  
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_review_images_badge_check' 
        AND tgrelid = 'public.review_images'::regclass
    ) THEN
        -- Create trigger for review images
        CREATE TRIGGER trigger_review_images_badge_check
            AFTER INSERT ON public.review_images
            FOR EACH ROW
            EXECUTE FUNCTION public.check_and_award_badges();
        
        RAISE NOTICE 'Created review_images badge trigger';
    ELSE
        RAISE NOTICE 'Review_images badge trigger already exists';
    END IF;

    -- Check if the trigger exists on review_helpful_votes table
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_review_helpful_votes_badge_check' 
        AND tgrelid = 'public.review_helpful_votes'::regclass
    ) THEN
        -- Create trigger for helpful votes
        CREATE TRIGGER trigger_review_helpful_votes_badge_check
            AFTER INSERT ON public.review_helpful_votes
            FOR EACH ROW
            EXECUTE FUNCTION public.check_and_award_badges();
        
        RAISE NOTICE 'Created review_helpful_votes badge trigger';
    ELSE
        RAISE NOTICE 'Review_helpful_votes badge trigger already exists';
    END IF;
END $$;

-- Award missing badges to existing users
INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
SELECT DISTINCT r.user_id, 'milestone_new_voice', NOW()
FROM reviews r
LEFT JOIN user_badges ub ON r.user_id = ub.user_id AND ub.badge_id = 'milestone_new_voice'
WHERE ub.user_id IS NULL
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Show results
SELECT 'Users with New Voice badge after fix' AS status, COUNT(*) AS count
FROM user_badges 
WHERE badge_id = 'milestone_new_voice';