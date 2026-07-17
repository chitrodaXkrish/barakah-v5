-- Drop any foreign key constraints that may reference auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.salah_log DROP CONSTRAINT IF EXISTS salah_log_user_id_fkey;
ALTER TABLE public.salah_streaks DROP CONSTRAINT IF EXISTS salah_streaks_user_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.hajj_bookings DROP CONSTRAINT IF EXISTS hajj_bookings_user_id_fkey;
ALTER TABLE public.hajj_trips DROP CONSTRAINT IF EXISTS hajj_trips_travel_partner_id_fkey;
ALTER TABLE public.guftagu_posts DROP CONSTRAINT IF EXISTS guftagu_posts_user_id_fkey;
ALTER TABLE public.guftagu_likes DROP CONSTRAINT IF EXISTS guftagu_likes_user_id_fkey;
ALTER TABLE public.guftagu_replies DROP CONSTRAINT IF EXISTS guftagu_replies_user_id_fkey;
ALTER TABLE public.admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;

-- Change user_id columns from UUID to TEXT for Firebase compatibility
ALTER TABLE public.user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.salah_log ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.salah_streaks ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.orders ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.hajj_bookings ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.hajj_trips ALTER COLUMN travel_partner_id TYPE TEXT USING travel_partner_id::TEXT;
ALTER TABLE public.guftagu_posts ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.guftagu_likes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.guftagu_replies ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.admin_logs ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;
ALTER TABLE public.products ALTER COLUMN seller_id TYPE TEXT USING seller_id::TEXT;

-- Recreate RLS policies with open access (Firebase handles auth externally, not Supabase)
CREATE POLICY "Allow all on user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on salah_log" ON public.salah_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on salah_streaks" ON public.salah_streaks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hajj_bookings" ON public.hajj_bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hajj_trips" ON public.hajj_trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on guftagu_posts" ON public.guftagu_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on guftagu_likes" ON public.guftagu_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on guftagu_replies" ON public.guftagu_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on admin_logs" ON public.admin_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on product_images" ON public.product_images FOR ALL USING (true) WITH CHECK (true);