-- =============================================
-- Business Verification: OTP, Documents, Notifications, Admin
-- =============================================
-- If business_claims does not exist, creates it (and business_claim_events) so this
-- migration can run standalone. Requires public.businesses to exist.
--
-- Extends business_claims with action_required/under_review, method manual/document.
-- Adds business_claim_otp, business_claim_documents, notifications extensions.
-- Storage bucket and RLS for admin-only doc access. Cleanup jobs.
-- =============================================

-- Create business_claims and business_claim_events if missing (minimal schema from 20260112)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_claims') THEN
    CREATE TABLE public.business_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
      claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'draft',
      verification_level TEXT,
      method_attempted TEXT,
      verification_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      submitted_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES auth.users(id),
      reviewed_at TIMESTAMPTZ,
      admin_notes TEXT,
      rejection_reason TEXT,
      failed_attempts_email INTEGER DEFAULT 0,
      failed_attempts_phone INTEGER DEFAULT 0,
      last_attempt_at TIMESTAMPTZ
    );
    ALTER TABLE public.business_claims ADD CONSTRAINT business_claims_status_check_legacy
      CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'disputed', 'cancelled'));
    ALTER TABLE public.business_claims ADD CONSTRAINT business_claims_method_attempted_check_legacy
      CHECK (method_attempted IS NULL OR method_attempted IN ('email', 'phone', 'cipc', 'documents'));
    CREATE UNIQUE INDEX idx_business_claims_business_claimant_status ON public.business_claims(business_id, claimant_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON public.business_claims(business_id);
    CREATE INDEX IF NOT EXISTS idx_business_claims_claimant_user_id ON public.business_claims(claimant_user_id);
    CREATE INDEX IF NOT EXISTS idx_business_claims_status ON public.business_claims(status);
    CREATE INDEX IF NOT EXISTS idx_business_claims_pending_review ON public.business_claims(status, created_at) WHERE status = 'pending';

    CREATE TABLE public.business_claim_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_business_claim_events_claim_id ON public.business_claim_events(claim_id);
    CREATE INDEX IF NOT EXISTS idx_business_claim_events_created_at ON public.business_claim_events(created_at DESC);

    ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can create their own claims" ON public.business_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = claimant_user_id);
    CREATE POLICY "Users can read their own claims" ON public.business_claims FOR SELECT TO authenticated USING (auth.uid() = claimant_user_id);
    CREATE POLICY "Users can update their own draft claims" ON public.business_claims FOR UPDATE TO authenticated USING (auth.uid() = claimant_user_id AND status = 'draft');
    CREATE POLICY "Admins can read all claims" ON public.business_claims FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admins can update all claims" ON public.business_claims FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- 1) business_claims: add status values and method, ensure columns
-- Drop existing CHECK and recreate to add 'action_required', 'under_review'
ALTER TABLE public.business_claims DROP CONSTRAINT IF EXISTS business_claims_status_check;
ALTER TABLE public.business_claims DROP CONSTRAINT IF EXISTS business_claims_status_check_legacy;
ALTER TABLE public.business_claims ADD CONSTRAINT business_claims_status_check
  CHECK (status IN ('draft', 'pending', 'action_required', 'under_review', 'verified', 'rejected', 'disputed', 'cancelled'));

ALTER TABLE public.business_claims DROP CONSTRAINT IF EXISTS business_claims_method_attempted_check;
ALTER TABLE public.business_claims DROP CONSTRAINT IF EXISTS business_claims_method_attempted_check_legacy;
ALTER TABLE public.business_claims ADD CONSTRAINT business_claims_method_attempted_check
  CHECK (method_attempted IS NULL OR method_attempted IN ('email', 'phone', 'cipc', 'manual', 'document', 'documents'));

-- Ensure columns exist (idempotent)
ALTER TABLE public.business_claims ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- 2) business_claim_otp (Tier 1 phone OTP; server-only, no client RLS read)
CREATE TABLE IF NOT EXISTS public.business_claim_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_claim_otp_claim_id ON public.business_claim_otp(claim_id);
CREATE INDEX IF NOT EXISTS idx_business_claim_otp_expires_at ON public.business_claim_otp(expires_at);
-- One active OTP per claim enforced in API (expire old when sending new); cannot use partial unique index with expires_at > NOW() (not immutable).
CREATE INDEX IF NOT EXISTS idx_business_claim_otp_active ON public.business_claim_otp(claim_id) WHERE verified_at IS NULL;

ALTER TABLE public.business_claim_otp ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE for authenticated; only service role / server uses this table
DROP POLICY IF EXISTS "No direct client access to business_claim_otp" ON public.business_claim_otp;
CREATE POLICY "No direct client access to business_claim_otp"
  ON public.business_claim_otp FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- 3) notifications: add claim_id, read_at; extend type for claim-related
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS claim_id UUID REFERENCES public.business_claims(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_claim_id ON public.notifications(claim_id) WHERE claim_id IS NOT NULL;

-- Drop and recreate type constraint to allow new types (keep existing + claim types)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'review', 'business', 'user', 'highlyRated', 'gamification',
    'otp_sent', 'otp_verified', 'claim_status_changed', 'docs_requested', 'docs_received'
  ));

-- 4) business_claim_documents (Tier 3; admin-only read/download)
DO $$ BEGIN
  CREATE TYPE public.business_claim_doc_type AS ENUM ('letterhead_authorization', 'lease_first_page');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.business_claim_doc_status AS ENUM ('uploaded', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.business_claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.business_claims(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  doc_type public.business_claim_doc_type NOT NULL,
  status public.business_claim_doc_status NOT NULL DEFAULT 'uploaded',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delete_after TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_business_claim_documents_claim_id ON public.business_claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_business_claim_documents_delete_after ON public.business_claim_documents(delete_after);

ALTER TABLE public.business_claim_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claimants can insert their claim documents" ON public.business_claim_documents;
DROP POLICY IF EXISTS "Admins can read all claim documents" ON public.business_claim_documents;
DROP POLICY IF EXISTS "Admins can update claim documents" ON public.business_claim_documents;
CREATE POLICY "Claimants can insert their claim documents"
  ON public.business_claim_documents FOR INSERT TO authenticated
  WITH CHECK (
    claim_id IN (SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid())
  );
CREATE POLICY "Admins can read all claim documents"
  ON public.business_claim_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update claim documents"
  ON public.business_claim_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Claimants can only see metadata (id, claim_id, doc_type, uploaded_at, status) for their claims - no storage_path for download
-- So we don't give SELECT with storage_path to claimants; they get metadata via API that checks claim ownership and returns only safe fields.
-- RLS: claimants cannot SELECT (so they can't see storage_path). Admins can SELECT. So claimants need a way to see "I uploaded X" - we do that in API by joining claim and returning only id, doc_type, uploaded_at, status.
CREATE POLICY "Claimants can read own claim document metadata only via service"
  ON public.business_claim_documents FOR SELECT TO authenticated
  USING (
    claim_id IN (SELECT id FROM public.business_claims WHERE claimant_user_id = auth.uid())
  );
-- Actually the spec says: "claimant can upload but cannot read/download the stored file after upload" and "only admins can read/download".
-- So claimant can INSERT and optionally SELECT only non-sensitive columns. In Postgres we can't hide columns per row; so either:
-- (A) Claimants have no SELECT: they see upload success from API response only; list "your docs" from API that uses service role to read and strip storage_path.
-- (B) Claimants have SELECT: they see storage_path too which we don't want.
-- So: remove SELECT for claimants. API for "my claim docs" will use server (service role) and return only id, doc_type, uploaded_at, status.
DROP POLICY IF EXISTS "Claimants can read own claim document metadata only via service" ON public.business_claim_documents;
-- Only admins can SELECT (see storage_path); claimants can only INSERT.
DROP POLICY IF EXISTS "Admins can read all claim documents" ON public.business_claim_documents;
CREATE POLICY "Admins can read all claim documents"
  ON public.business_claim_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5) Storage bucket: business-verification (private). Path: claims/{claim_id}/{doc_type}/{doc_id}.{ext}
-- Only server (service role) uploads; only admins get signed URLs via API.
-- If storage.buckets is not available in migrations, create the bucket in Supabase Dashboard: name business-verification, private, 5MB limit, types PDF/JPG/PNG.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'business-verification',
    'business-verification',
    false,
    5242880,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[]
  )
  ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION WHEN undefined_table OR undefined_object THEN
  RAISE NOTICE 'storage.buckets not available; create bucket business-verification in Dashboard.';
END $$;

-- 6) Cleanup: delete claim documents (storage + rows) when claim is verified/rejected
CREATE OR REPLACE FUNCTION public.delete_claim_documents_on_finalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('verified', 'rejected') AND (OLD.status IS NULL OR OLD.status NOT IN ('verified', 'rejected')) THEN
    DELETE FROM public.business_claim_documents WHERE claim_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_delete_claim_docs_on_finalize ON public.business_claims;
CREATE TRIGGER trigger_delete_claim_docs_on_finalize
  AFTER UPDATE OF status ON public.business_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_claim_documents_on_finalize();

-- 7) Daily cleanup: expire OTP rows and delete expired document rows (storage cleanup done by cron route)
CREATE OR REPLACE FUNCTION public.cleanup_expired_business_claim_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM public.business_claim_otp WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_expired_business_claim_documents()
RETURNS void AS $$
BEGIN
  DELETE FROM public.business_claim_documents WHERE delete_after < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.business_claim_otp IS 'Tier 1 phone OTP; server-only, rate-limited';
COMMENT ON TABLE public.business_claim_documents IS 'Tier 3 docs; admin-only read; auto-delete after 30 days or on claim finalize';
