-- Reclassify Quicket event categories to match the fixed taxonomy and current
-- Quicket website category set. Specials remain untouched.

-- Ensure category columns exist before reclassification (safe for fresh/partial DBs).
ALTER TABLE public.events_and_specials
  ADD COLUMN IF NOT EXISTS quicket_category_slug text,
  ADD COLUMN IF NOT EXISTS quicket_category_label text;

WITH quicket_rows AS (
  SELECT
    id,
    lower(trim(coalesce(quicket_category_label, ''))) AS category_label,
    lower(trim(concat_ws(' ', coalesce(title, ''), coalesce(description, '')))) AS haystack
  FROM public.events_and_specials
  WHERE type = 'event'
    AND lower(coalesce(icon, '')) = 'quicket'
),
classified AS (
  SELECT
    id,
    CASE
      WHEN category_label IN ('music') THEN 'music'
      WHEN category_label IN (
        'festival',
        'festivals',
        'occasion',
        'holiday & seasonal',
        'holiday and seasonal'
      ) THEN 'festivals'
      WHEN category_label IN (
        'tech & business',
        'tech-business',
        'business & industry',
        'business and industry',
        'science & technology',
        'science and technology'
      ) THEN 'tech-business'
      WHEN category_label IN (
        'arts',
        'arts & culture',
        'arts and culture',
        'film & media',
        'film and media',
        'afrikaans'
      ) THEN 'arts'
      WHEN category_label IN (
        'food & drink',
        'food and drink',
        'food-drink'
      ) THEN 'food-drink'
      WHEN category_label IN (
        'community',
        'health & wellness',
        'health and wellness',
        'sports & fitness',
        'sports and fitness',
        'travel & outdoor',
        'travel and outdoor',
        'hobbies & interests',
        'hobbies and interests',
        'charity & causes',
        'charity and causes',
        'faith & spirituality',
        'faith and spirituality',
        'family & education',
        'family and education',
        'other',
        'general',
        'misc',
        'miscellaneous'
      ) THEN 'community'
      WHEN haystack ~* '(festival|\\mfest\\M|carnival|block party|street party|celebration|holiday|seasonal|occasion)' THEN 'festivals'
      WHEN haystack ~* '(music|concert|live show|live music|\\mdj\\M|\\mband\\M|orchestra|gig|jazz|rock|hip[ -]?hop|electronic|house)' THEN 'music'
      WHEN haystack ~* '(tech|technology|science|business|industry|startup|start-up|entrepreneur|networking|conference|summit|innovation|digital|fintech|\\mai\\M)' THEN 'tech-business'
      WHEN haystack ~* '(\\mart\\M|\\marts\\M|culture|theatre|theater|comedy|film|media|cinema|dance|poetry|gallery|exhibition|performance|afrikaans)' THEN 'arts'
      WHEN haystack ~* '(food|drink|wine|beer|cocktail|dining|dinner|lunch|brunch|culinary|tasting|restaurant|market)' THEN 'food-drink'
      ELSE 'community'
    END AS category_slug
  FROM quicket_rows
)
UPDATE public.events_and_specials e
SET
  quicket_category_slug = c.category_slug,
  quicket_category_label = CASE c.category_slug
    WHEN 'music' THEN 'Music'
    WHEN 'festivals' THEN 'Festivals'
    WHEN 'tech-business' THEN 'Tech & Business'
    WHEN 'arts' THEN 'Arts'
    WHEN 'food-drink' THEN 'Food & Drink'
    ELSE 'Community'
  END,
  updated_at = now()
FROM classified c
WHERE e.id = c.id;
