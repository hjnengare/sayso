-- Fix the review trigger to properly calculate percentiles
-- The existing trigger only updates basic stats (count, average) but doesn't calculate percentiles
-- This migration fixes it to call the full update_business_stats() function

-- Update the trigger function to call the full stats calculation
CREATE OR REPLACE FUNCTION update_business_stats_on_review_change()
RETURNS TRIGGER AS $$
DECLARE
  business_uuid UUID;
BEGIN
  -- Get business_id from the review
  IF TG_OP = 'DELETE' THEN
    business_uuid := OLD.business_id;
  ELSE
    business_uuid := NEW.business_id;
  END IF;

  -- Call the full update_business_stats function to calculate:
  -- - total_reviews
  -- - average_rating
  -- - rating_distribution
  -- - percentiles (punctuality, friendliness, trustworthiness, cost-effectiveness)
  PERFORM update_business_stats(business_uuid);

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger already exists from previous migration (20260225_ensure_review_stats_trigger.sql)
-- Just updating the function implementation here
