
CREATE TABLE public.seller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  seller_display_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone_country_code TEXT DEFAULT '+971',
  phone_number TEXT,
  country_of_operations TEXT DEFAULT 'United Arab Emirates',
  halal_compliant BOOLEAN DEFAULT false,
  no_prohibited_categories BOOLEAN DEFAULT false,
  understands_review BOOLEAN DEFAULT false,
  agreed_to_terms BOOLEAN DEFAULT false,
  banner_url TEXT,
  logo_url TEXT,
  about_us TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  stripe_connected BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_profiles TO authenticated, anon;
GRANT ALL ON public.seller_profiles TO service_role;

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on seller_profiles"
  ON public.seller_profiles FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_seller_profiles_updated_at
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
