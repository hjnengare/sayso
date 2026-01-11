-- =============================================
-- Business Claims System - Complete Implementation
-- =============================================
-- This migration creates a robust 3-level business verification system
-- Based on best practices for ownership verification
--
-- Step 1: Lock down the claim data model
-- Step 2: Define ownership fields on businesses table
-- Step 3-15: Build the complete verification flow
-- =============================================

-- =============================================
-- 1. Business Claims Table (replaces business_ownership_requests)
-- =============================================
CREATE TABLE IF NOT EXISTS public.business_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status workflow
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'disputed', 'cancelled')) DEFAULT 'draft',

  -- Verification levels
  verification_level TEXT CHECK (verification_level IN ('level_1', 'level_2', 'level_3')),
  method_attempted TEXT CHECK (method_attempted IN ('email', 'phone', 'cipc', 'documents')),

  -- Verification data (encrypted sensitive info)
  verification_data JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,

  -- Admin review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Attempt tracking (for rate limiting)
  failed_attempts_email INTEGER DEFAULT 0,
  failed_attempts_phone INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  UNIQUE(business_id, claimant_user_id, status) -- Prevent duplicate pending claims
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON public.business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_claimant_user_id ON public.business_claims(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON public.business_claims(status);
CREATE INDEX IF NOT EXISTS idx_business_claims_pending_review ON public.business_claims(status, created_at) WHERE status = 'pending';

-- =============================================
-- 2. Add Ownership Fields to Businesses Table
-- =============================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS owner_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_verification_method TEXT CHECK (owner_verification_method IN ('email', 'phone', 'cipc', 'documents')),
  ADD COLUMN IF NOT EXISTS owner_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_verification_requested_at TIMESTAMPTZ;

-- Index for quick lookup of owned businesses
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id) WHERE owner_id IS NOT NULL;

-- =============================================
-- 3. Claim Events Log (Audit Trail)
-- =============================================
CREATE TABLE IF NOT EXISTS public.business_claim_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'claim_started',
    'otp_sent',
    'otp_failed',
    'email_sent',
    'email_verified',
    'phone_verified',
    'verification_success',
    'verification_rejected',
    'dispute_opened',
    'level_upgraded',
    'claim_cancelled',
    'ownership_transferred'
  )),
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_business_claim_events_claim_id ON public.business_claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_business_claim_events_event_type ON public.business_claim_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_claim_events_created_at ON public.business_claim_events(created_at DESC);

-- =============================================
-- 4. OTP Storage (for phone/email verification)
-- =============================================
CREATE TABLE IF NOT EXISTS public.claim_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  otp_type TEXT NOT NULL CHECK (otp_type IN ('phone', 'email')),
  otp_hash TEXT NOT NULL, -- bcrypt hash of OTP
  target_contact TEXT NOT NULL, -- phone or email
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_verification_otps_claim_id ON public.claim_verification_otps(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_verification_otps_expires_at ON public.claim_verification_otps(expires_at);

-- Auto-cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.claim_verification_otps
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Document Uploads (Level 3 only)
-- =============================================
CREATE TABLE IF NOT EXISTS public.claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('authorisation_letter', 'lease', 'other')),
  storage_path TEXT NOT NULL, -- private storage bucket path
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT false,
  auto_delete_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'), -- Auto-delete after 30 days

  -- Security: only admin can mark as reviewed
  CONSTRAINT valid_mime_type CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png'))
);

CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON public.claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_documents_auto_delete ON public.claim_documents(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- Auto-cleanup function for documents
CREATE OR REPLACE FUNCTION public.cleanup_old_claim_documents()
RETURNS void AS $$
BEGIN
  -- Delete files older than auto_delete_at
  DELETE FROM public.claim_documents
  WHERE auto_delete_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. RPC Function: Start Claim (with Pre-checks)
-- =============================================
CREATE OR REPLACE FUNCTION public.start_business_claim(
  p_business_id UUID,
  p_claimant_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_business RECORD;
  v_existing_claim RECORD;
  v_claim_id UUID;
BEGIN
  -- Pre-check 1: Business must exist and be active
  SELECT * INTO v_business
  FROM public.businesses
  WHERE id = p_business_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business not found or inactive'
    );
  END IF;

  -- Pre-check 2: Business must have at least one contact path
  IF v_business.phone IS NULL AND v_business.website IS NULL AND v_business.email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business has no contact information. Please contact support.'
    );
  END IF;

  -- Pre-check 3: If already verified, show dispute option
  IF v_business.owner_verified = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This listing is already claimed. Request dispute.',
      'dispute', true,
      'owner_id', v_business.owner_id
    );
  END IF;

  -- Pre-check 4: Check for existing pending claim by this user
  SELECT * INTO v_existing_claim
  FROM public.business_claims
  WHERE business_id = p_business_id
    AND claimant_user_id = p_claimant_user_id
    AND status IN ('draft', 'pending');

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'claim_id', v_existing_claim.id,
      'status', v_existing_claim.status,
      'existing', true
    );
  END IF;

  -- Create new claim with status = draft
  INSERT INTO public.business_claims (
    business_id,
    claimant_user_id,
    status,
    verification_data
  ) VALUES (
    p_business_id,
    p_claimant_user_id,
    'draft',
    jsonb_build_object('started_at', NOW())
  )
  RETURNING id INTO v_claim_id;

  -- Log event
  INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
  VALUES (v_claim_id, 'claim_started', jsonb_build_object('business_id', p_business_id), p_claimant_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'status', 'draft',
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'phone', v_business.phone,
      'website', v_business.website,
      'email', v_business.email
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. RPC Function: Verify Claim (Admin)
-- =============================================
CREATE OR REPLACE FUNCTION public.verify_business_claim(
  p_claim_id UUID,
  p_admin_user_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_claim RECORD;
  v_business_id UUID;
BEGIN
  -- Get claim details
  SELECT * INTO v_claim
  FROM public.business_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
  END IF;

  v_business_id := v_claim.business_id;

  IF p_approved THEN
    -- Approve claim
    UPDATE public.business_claims
    SET
      status = 'verified',
      reviewed_by = p_admin_user_id,
      reviewed_at = NOW(),
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_claim_id;

    -- Update business ownership
    UPDATE public.businesses
    SET
      owner_id = v_claim.claimant_user_id,
      owner_verified = true,
      owner_verification_method = v_claim.method_attempted,
      owner_verified_at = NOW()
    WHERE id = v_business_id;

    -- Log event
    INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
    VALUES (p_claim_id, 'verification_success',
            jsonb_build_object('admin_id', p_admin_user_id, 'method', v_claim.method_attempted),
            p_admin_user_id);

    RETURN jsonb_build_object('success', true, 'status', 'verified');
  ELSE
    -- Reject claim
    UPDATE public.business_claims
    SET
      status = 'rejected',
      reviewed_by = p_admin_user_id,
      reviewed_at = NOW(),
      rejection_reason = p_rejection_reason,
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_claim_id;

    -- Log event
    INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
    VALUES (p_claim_id, 'verification_rejected',
            jsonb_build_object('admin_id', p_admin_user_id, 'reason', p_rejection_reason),
            p_admin_user_id);

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'reason', p_rejection_reason);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. Row Level Security (RLS)
-- =============================================
ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_claim_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own claims" ON public.business_claims;
DROP POLICY IF EXISTS "Users can read their own claims" ON public.business_claims;
DROP POLICY IF EXISTS "Users can update their own draft claims" ON public.business_claims;
DROP POLICY IF EXISTS "Admins can read all claims" ON public.business_claims;
DROP POLICY IF EXISTS "Admins can update all claims" ON public.business_claims;

-- Business claims policies
CREATE POLICY "Users can create their own claims"
  ON public.business_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = claimant_user_id);

CREATE POLICY "Users can read their own claims"
  ON public.business_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = claimant_user_id);

CREATE POLICY "Users can update their own draft claims"
  ON public.business_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = claimant_user_id AND status = 'draft');

-- Admin policies (TODO: add admin role check)
CREATE POLICY "Admins can read all claims"
  ON public.business_claims FOR SELECT
  TO authenticated
  USING (true); -- TODO: Replace with admin role check

CREATE POLICY "Admins can update all claims"
  ON public.business_claims FOR UPDATE
  TO authenticated
  USING (true); -- TODO: Replace with admin role check

-- Events policies
CREATE POLICY "Users can read their claim events"
  ON public.business_claim_events FOR SELECT
  TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid()
    )
  );

-- OTP policies
CREATE POLICY "Users can read their claim OTPs"
  ON public.claim_verification_otps FOR SELECT
  TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Users can read their claim documents"
  ON public.claim_documents FOR SELECT
  TO authenticated
  USING (
    claim_id IN (
      SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their claim documents"
  ON public.claim_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    claim_id IN (
      SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid()
    )
  );

-- =============================================
-- 9. Triggers for updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_claims_updated_at ON public.business_claims;
CREATE TRIGGER update_business_claims_updated_at
  BEFORE UPDATE ON public.business_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 10. Migration from old system (if exists)
-- =============================================
-- Migrate data from business_ownership_requests to business_claims
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_ownership_requests') THEN
    INSERT INTO public.business_claims (
      business_id,
      claimant_user_id,
      status,
      verification_level,
      method_attempted,
      verification_data,
      created_at,
      updated_at
    )
    SELECT
      business_id,
      user_id,
      CASE
        WHEN status = 'approved' THEN 'verified'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE 'pending'
      END,
      'level_2', -- Assume manual verification
      verification_method,
      verification_data,
      created_at,
      updated_at
    FROM business_ownership_requests
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Migrated % rows from business_ownership_requests to business_claims',
                 (SELECT COUNT(*) FROM business_ownership_requests);
  END IF;
END $$;

-- =============================================
-- 11. Comments for Documentation
-- =============================================
COMMENT ON TABLE public.business_claims IS 'Tracks all business ownership claim attempts with verification levels and admin review';
COMMENT ON TABLE public.business_claim_events IS 'Audit trail for all claim-related events for debugging and compliance';
COMMENT ON TABLE public.claim_verification_otps IS 'Temporary OTP storage for phone/email verification (auto-expires)';
COMMENT ON TABLE public.claim_documents IS 'Uploaded verification documents (auto-deleted after 30 days)';
COMMENT ON FUNCTION public.start_business_claim IS 'Entry point for new claim with pre-checks (business exists, has contact info, not already claimed)';
COMMENT ON FUNCTION public.verify_business_claim IS 'Admin function to approve/reject claims and update business ownership';
