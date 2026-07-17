CREATE TABLE public.app_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  overall_rating INT NOT NULL,
  ease_of_use INT,
  most_used_feature TEXT,
  missing_features TEXT,
  bugs_encountered TEXT,
  would_recommend TEXT,
  additional_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.app_feedback TO anon, authenticated;
GRANT ALL ON public.app_feedback TO service_role;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.app_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view feedback" ON public.app_feedback FOR SELECT TO anon, authenticated USING (true);