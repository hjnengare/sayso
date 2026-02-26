-- ============================================
-- Business Profile Guest Views Tracking
-- ============================================
-- Tracks unique daily guest views per business
-- using anonymous_id identifiers.
-- ============================================

CREATE TABLE IF NOT EXISTS business_profile_guest_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  anonymous_id UUID NOT NULL,
  viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One guest view per anonymous_id per business per day
  UNIQUE(business_id, anonymous_id, viewed_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bp_guest_views_business_id
  ON public.business_profile_guest_views(business_id);
CREATE INDEX IF NOT EXISTS idx_bp_guest_views_anonymous_id
  ON public.business_profile_guest_views(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_bp_guest_views_business_viewed
  ON public.business_profile_guest_views(business_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE public.business_profile_guest_views ENABLE ROW LEVEL SECURITY;

-- Allow all clients (anonymous and authenticated) to record guest views.
CREATE POLICY "Anyone can insert guest profile views"
  ON public.business_profile_guest_views
  FOR INSERT
  WITH CHECK (true);

-- Business owners can read guest views for their businesses.
CREATE POLICY "Business owners can read guest profile views"
  ON public.business_profile_guest_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE businesses.id = business_profile_guest_views.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

COMMENT ON TABLE public.business_profile_guest_views IS
  'Tracks unique daily guest profile views per business using anonymous identifiers.';
COMMENT ON COLUMN public.business_profile_guest_views.viewed_at IS
  'Date of the view (deduplicated per day)';
