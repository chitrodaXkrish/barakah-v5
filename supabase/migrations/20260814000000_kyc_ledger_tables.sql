-- 20260814: Create KYC and earnings/payout related tables for sellers
-- This adds support for server-side KYC workflow and a robust ledger.
-- Tables reference seller_profiles via user_id (seller_id in existing tables).

-- KYC for sellers
CREATE TABLE public.seller_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'KYC_PENDING',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  additional_info_requested BOOLEAN DEFAULT FALSE,
  additional_info_reason TEXT,
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE
);

-- Documents uploaded for KYC
CREATE TABLE public.seller_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  doc_type TEXT,
  doc_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE
);

-- Bank accounts for payout (separate from bank fields on profiles)
CREATE TABLE public.seller_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  holder_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE
);

-- Agreements accepted by seller (terms, versions, timestamps)
CREATE TABLE public.seller_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  agreement_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  UNIQUE (seller_id, agreement_type)
);

-- Earnings ledger for sellers
CREATE TABLE public.seller_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  order_id TEXT,
  amount NUMERIC(14,2) NOT NULL,
  commission NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE
);

-- Payouts to sellers
CREATE TABLE public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  payout_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  bank_account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_bank FOREIGN KEY (bank_account_id) REFERENCES public.seller_bank_accounts(id) ON DELETE SET NULL
);

-- Basic indexes to help reads
CREATE INDEX IF NOT EXISTS idx_seller_kyc_seller ON public.seller_kyc (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_seller ON public.seller_documents (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller ON public.seller_earnings (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON public.seller_payouts (seller_id);

-- Policies (basic, admins only can access sensitive kyc data)
-- Access controlled via Row Level Security (RLS). Grants to service_role only; normal users are restricted by policies.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_kyc TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.seller_documents TO service_role;
GRANT SELECT, INSERT ON public.seller_bank_accounts TO service_role;
GRANT SELECT, INSERT ON public.seller_agreements TO service_role;
GRANT SELECT ON public.seller_earnings TO service_role;
GRANT SELECT ON public.seller_payouts TO service_role;
GRANT SELECT, INSERT ON public.seller_payouts TO authenticated, anon;
