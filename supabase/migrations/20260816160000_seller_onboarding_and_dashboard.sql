-- -----------------------------------------------------------------------------
-- 20260816160000_seller_onboarding_and_dashboard.sql
-- Complete Seller Onboarding, KYC, Bank Account, Agreements & Dashboard schema additions
-- -----------------------------------------------------------------------------

ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS pan TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'REGISTERED',
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1;

-- KYC table
CREATE TABLE IF NOT EXISTS public.seller_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  additional_info_requested BOOLEAN DEFAULT FALSE,
  additional_info_reason TEXT,
  pan TEXT,
  id_doc_type TEXT,
  address_proof_type TEXT,
  business_pan TEXT,
  incorporation_doc_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.seller_kyc ENABLE ROW LEVEL SECURITY;

-- Documents table
CREATE TABLE IF NOT EXISTS public.seller_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  doc_url TEXT,
  storage_path TEXT,
  status TEXT DEFAULT 'PENDING',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.seller_documents ENABLE ROW LEVEL SECURITY;

-- Bank accounts table
CREATE TABLE IF NOT EXISTS public.seller_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'SAVINGS',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Agreements table
CREATE TABLE IF NOT EXISTS public.seller_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  agreement_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, agreement_type)
);
ALTER TABLE public.seller_agreements ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_kyc TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_agreements TO authenticated;

-- RLS Policies
DROP POLICY IF EXISTS "Sellers manage own kyc" ON public.seller_kyc;
CREATE POLICY "Sellers manage own kyc" ON public.seller_kyc
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()::text)
  WITH CHECK (seller_id = auth.uid()::text);

DROP POLICY IF EXISTS "Sellers manage own documents" ON public.seller_documents;
CREATE POLICY "Sellers manage own documents" ON public.seller_documents
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()::text)
  WITH CHECK (seller_id = auth.uid()::text);

DROP POLICY IF EXISTS "Sellers manage own bank account" ON public.seller_bank_accounts;
CREATE POLICY "Sellers manage own bank account" ON public.seller_bank_accounts
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()::text)
  WITH CHECK (seller_id = auth.uid()::text);

DROP POLICY IF EXISTS "Sellers manage own agreements" ON public.seller_agreements;
CREATE POLICY "Sellers manage own agreements" ON public.seller_agreements
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()::text)
  WITH CHECK (seller_id = auth.uid()::text);

-- Storage bucket for secure KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Sellers manage own kyc storage" ON storage.objects;
CREATE POLICY "Sellers manage own kyc storage"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'seller-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'seller-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
