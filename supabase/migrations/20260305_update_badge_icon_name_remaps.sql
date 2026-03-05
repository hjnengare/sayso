-- Align badge icon_name values to canonical remapped assets.
-- This patches existing environments where 20260119 has already run.

BEGIN;

UPDATE public.badges
SET icon_name = 'memory-maker.png'
WHERE id IN ('explorer_full_circle', 'specialist_experiences_memory_maker');

UPDATE public.badges
SET icon_name = 'flavour-finder.png'
WHERE id IN ('specialist_food_flavour_finder', 'specialist_food_dessert_detective');

UPDATE public.badges
SET icon_name = '038-plug.png'
WHERE id = 'community_plug_of_year';

COMMIT;
