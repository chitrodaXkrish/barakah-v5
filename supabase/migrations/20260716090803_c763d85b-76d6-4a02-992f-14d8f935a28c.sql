
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.app_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.app_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (auth.uid())::text);
