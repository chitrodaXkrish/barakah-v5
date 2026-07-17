
-- chat_threads: replace 'Allow all' with per-user policies
DROP POLICY IF EXISTS "Allow all on chat_threads" ON public.chat_threads;
CREATE POLICY "Users select own chat threads" ON public.chat_threads FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Users insert own chat threads" ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users update own chat threads" ON public.chat_threads FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users delete own chat threads" ON public.chat_threads FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- chat_messages: replace 'Allow all' with per-user policies
DROP POLICY IF EXISTS "Allow all on chat_messages" ON public.chat_messages;
CREATE POLICY "Users select own chat messages" ON public.chat_messages FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);
CREATE POLICY "Users insert own chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users update own chat messages" ON public.chat_messages FOR UPDATE TO authenticated USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);
CREATE POLICY "Users delete own chat messages" ON public.chat_messages FOR DELETE TO authenticated USING (user_id = (auth.uid())::text);

-- app_feedback: restrict SELECT to admins only; keep public INSERT
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.app_feedback;
CREATE POLICY "Admins view feedback" ON public.app_feedback FOR SELECT TO authenticated USING (public.has_role((auth.uid())::text, 'admin'::app_role));

-- profiles: consolidate duplicate public SELECT to authenticated-only
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- user_roles: restrict SELECT to owner (has_role() is SECURITY DEFINER so admin checks still work)
DROP POLICY IF EXISTS "Anyone can read user_roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = (auth.uid())::text);

-- guftagu_* tables: restrict SELECT to authenticated only (drop anon exposure over Realtime)
DROP POLICY IF EXISTS "Anyone can view guftagu posts" ON public.guftagu_posts;
CREATE POLICY "Authenticated view guftagu posts" ON public.guftagu_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view guftagu replies" ON public.guftagu_replies;
CREATE POLICY "Authenticated view guftagu replies" ON public.guftagu_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view guftagu likes" ON public.guftagu_likes;
CREATE POLICY "Authenticated view guftagu likes" ON public.guftagu_likes FOR SELECT TO authenticated USING (true);
