-- Admin approval workflow for business uploads
-- New uploads: status = pending_approval, is_hidden = true. Only active + not hidden appear publicly.
-- Approve: status = active, is_hidden = false. Disapprove: status = rejected, is_hidden = true.

-- 1. Allow status values: pending_approval, rejected (keep active, inactive, pending)
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_status_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'pending_approval', 'rejected'));

-- 2. is_hidden: when true, exclude from public listings (backup to status; default true for new rows)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT true;

-- Existing active businesses should be visible
UPDATE public.businesses
  SET is_hidden = false
  WHERE status = 'active' AND (is_hidden IS NULL OR is_hidden = true);

-- New rows default to hidden; approval sets is_hidden = false
COMMENT ON COLUMN public.businesses.is_hidden IS 'When true, business is not shown in public lists. Set false on admin approval.';

-- 3. Rejection reason (optional, for disapprovals)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.businesses.rejection_reason IS 'Optional reason set by admin when disapproving a pending business.';

-- 4. Optional audit: approved_at / approved_by (if you want to track who approved)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_businesses_pending_approval
  ON public.businesses(created_at DESC)
  WHERE status = 'pending_approval';
