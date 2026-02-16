-- Backfill percentiles for all businesses with reviews
-- This recalculates stats for businesses that have reviews but are missing percentiles

DO $$
DECLARE
  business_record RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Log start
  RAISE NOTICE 'Starting business stats backfill for businesses with reviews...';
  
  -- Process all businesses that have reviews
  FOR business_record IN 
    SELECT DISTINCT b.id, b.name
    FROM businesses b
    INNER JOIN reviews r ON r.business_id = b.id
    WHERE b.status = 'active'
    ORDER BY b.id
  LOOP
    BEGIN
      -- Update stats for this business
      PERFORM update_business_stats(business_record.id);
      processed_count := processed_count + 1;
      
      -- Log progress every 10 businesses
      IF processed_count % 10 = 0 THEN
        RAISE NOTICE 'Processed % businesses...', processed_count;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Error processing business % (%): %', business_record.id, business_record.name, SQLERRM;
    END;
  END LOOP;
  
  -- Log completion
  RAISE NOTICE 'Backfill completed: % businesses processed, % errors', processed_count, error_count;
  
  -- Verify results
  RAISE NOTICE 'Businesses with reviews and percentiles: %', (
    SELECT COUNT(*)
    FROM businesses b
    INNER JOIN reviews r ON r.business_id = b.id
    INNER JOIN business_stats bs ON bs.business_id = b.id
    WHERE b.status = 'active' AND bs.percentiles IS NOT NULL
  );
END $$;
