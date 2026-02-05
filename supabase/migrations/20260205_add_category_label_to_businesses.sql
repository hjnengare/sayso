-- =============================================
-- Add category_label to businesses (canonical slug → display label)
-- =============================================
-- businesses.category is now a canonical slug (one of 39).
-- category_label stores the human-readable label; kept in sync via trigger.

-- Add column if not exists (PG 9.5+)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS category_label TEXT;

-- Backfill: set category_label from category slug using canonical mapping
-- (Matches SUBCATEGORY_SLUG_TO_LABEL in subcategoryPlaceholders.ts)
UPDATE public.businesses
SET category_label = CASE LOWER(TRIM(COALESCE(category, '')))
  WHEN 'restaurants' THEN 'Restaurants'
  WHEN 'cafes' THEN 'Cafés & Coffee'
  WHEN 'bars' THEN 'Bars & Pubs'
  WHEN 'fast-food' THEN 'Fast Food'
  WHEN 'fine-dining' THEN 'Fine Dining'
  WHEN 'gyms' THEN 'Gyms & Fitness'
  WHEN 'spas' THEN 'Spas'
  WHEN 'salons' THEN 'Hair Salons'
  WHEN 'wellness' THEN 'Wellness Centers'
  WHEN 'nail-salons' THEN 'Nail Salons'
  WHEN 'education-learning' THEN 'Education & Learning'
  WHEN 'transport-travel' THEN 'Transport & Travel'
  WHEN 'finance-insurance' THEN 'Finance & Insurance'
  WHEN 'plumbers' THEN 'Plumbers'
  WHEN 'electricians' THEN 'Electricians'
  WHEN 'legal-services' THEN 'Legal Services'
  WHEN 'hiking' THEN 'Hiking'
  WHEN 'cycling' THEN 'Cycling'
  WHEN 'water-sports' THEN 'Water Sports'
  WHEN 'camping' THEN 'Camping'
  WHEN 'events-festivals' THEN 'Events & Festivals'
  WHEN 'sports-recreation' THEN 'Sports & Recreation'
  WHEN 'nightlife' THEN 'Nightlife'
  WHEN 'comedy-clubs' THEN 'Comedy Clubs'
  WHEN 'cinemas' THEN 'Cinemas'
  WHEN 'museums' THEN 'Museums'
  WHEN 'galleries' THEN 'Art Galleries'
  WHEN 'theaters' THEN 'Theatres'
  WHEN 'concerts' THEN 'Concerts'
  WHEN 'family-activities' THEN 'Family Activities'
  WHEN 'pet-services' THEN 'Pet Services'
  WHEN 'childcare' THEN 'Childcare'
  WHEN 'veterinarians' THEN 'Veterinarians'
  WHEN 'fashion' THEN 'Fashion & Clothing'
  WHEN 'electronics' THEN 'Electronics'
  WHEN 'home-decor' THEN 'Home Décor'
  WHEN 'books' THEN 'Books & Stationery'
  WHEN 'miscellaneous' THEN 'Miscellaneous'
  WHEN 'restaurant' THEN 'Restaurants'
  WHEN 'cafe' THEN 'Cafés & Coffee'
  WHEN 'bar' THEN 'Bars & Pubs'
  WHEN 'salon' THEN 'Hair Salons'
  WHEN 'gym' THEN 'Gyms & Fitness'
  WHEN 'spa' THEN 'Spas'
  WHEN 'museum' THEN 'Museums'
  WHEN 'gallery' THEN 'Art Galleries'
  WHEN 'theater' THEN 'Theatres'
  WHEN 'theatres' THEN 'Theatres'
  WHEN 'concert' THEN 'Concerts'
  WHEN 'cinema' THEN 'Cinemas'
  WHEN 'bookstore' THEN 'Books & Stationery'
  ELSE 'Miscellaneous'
END
WHERE category_label IS NULL OR category_label = '';

-- Trigger: keep category_label in sync when category changes
CREATE OR REPLACE FUNCTION public.sync_business_category_label()
RETURNS TRIGGER AS $$
BEGIN
  NEW.category_label := CASE LOWER(TRIM(COALESCE(NEW.category, '')))
    WHEN 'restaurants' THEN 'Restaurants'
    WHEN 'cafes' THEN 'Cafés & Coffee'
    WHEN 'bars' THEN 'Bars & Pubs'
    WHEN 'fast-food' THEN 'Fast Food'
    WHEN 'fine-dining' THEN 'Fine Dining'
    WHEN 'gyms' THEN 'Gyms & Fitness'
    WHEN 'spas' THEN 'Spas'
    WHEN 'salons' THEN 'Hair Salons'
    WHEN 'wellness' THEN 'Wellness Centers'
    WHEN 'nail-salons' THEN 'Nail Salons'
    WHEN 'education-learning' THEN 'Education & Learning'
    WHEN 'transport-travel' THEN 'Transport & Travel'
    WHEN 'finance-insurance' THEN 'Finance & Insurance'
    WHEN 'plumbers' THEN 'Plumbers'
    WHEN 'electricians' THEN 'Electricians'
    WHEN 'legal-services' THEN 'Legal Services'
    WHEN 'hiking' THEN 'Hiking'
    WHEN 'cycling' THEN 'Cycling'
    WHEN 'water-sports' THEN 'Water Sports'
    WHEN 'camping' THEN 'Camping'
    WHEN 'events-festivals' THEN 'Events & Festivals'
    WHEN 'sports-recreation' THEN 'Sports & Recreation'
    WHEN 'nightlife' THEN 'Nightlife'
    WHEN 'comedy-clubs' THEN 'Comedy Clubs'
    WHEN 'cinemas' THEN 'Cinemas'
    WHEN 'museums' THEN 'Museums'
    WHEN 'galleries' THEN 'Art Galleries'
    WHEN 'theaters' THEN 'Theatres'
    WHEN 'concerts' THEN 'Concerts'
    WHEN 'family-activities' THEN 'Family Activities'
    WHEN 'pet-services' THEN 'Pet Services'
    WHEN 'childcare' THEN 'Childcare'
    WHEN 'veterinarians' THEN 'Veterinarians'
    WHEN 'fashion' THEN 'Fashion & Clothing'
    WHEN 'electronics' THEN 'Electronics'
    WHEN 'home-decor' THEN 'Home Décor'
    WHEN 'books' THEN 'Books & Stationery'
    WHEN 'miscellaneous' THEN 'Miscellaneous'
    WHEN 'restaurant' THEN 'Restaurants'
    WHEN 'cafe' THEN 'Cafés & Coffee'
    WHEN 'bar' THEN 'Bars & Pubs'
    WHEN 'salon' THEN 'Hair Salons'
    WHEN 'gym' THEN 'Gyms & Fitness'
    WHEN 'spa' THEN 'Spas'
    WHEN 'museum' THEN 'Museums'
    WHEN 'gallery' THEN 'Art Galleries'
    WHEN 'theater' THEN 'Theatres'
    WHEN 'theatres' THEN 'Theatres'
    WHEN 'concert' THEN 'Concerts'
    WHEN 'cinema' THEN 'Cinemas'
    WHEN 'bookstore' THEN 'Books & Stationery'
    ELSE 'Miscellaneous'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_business_category_label_trigger ON public.businesses;
CREATE TRIGGER sync_business_category_label_trigger
  BEFORE INSERT OR UPDATE OF category
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_business_category_label();

COMMENT ON COLUMN public.businesses.category_label IS 'Display label for category (canonical slug). Synced from category by trigger.';
