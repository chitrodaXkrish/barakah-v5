
-- Drop dependent policies first
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage news sources" ON public.news_sources;
DROP POLICY IF EXISTS "Admins can manage news articles" ON public.news_articles;

-- Replace helper functions: text signature + SECURITY INVOKER
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id text)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(text, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- Recreate admin/news policies with new signature
CREATE POLICY "Admins can manage news sources" ON public.news_sources
FOR ALL TO authenticated
USING (public.has_role(auth.uid()::text, 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid()::text, 'admin'::app_role));

CREATE POLICY "Admins can manage news articles" ON public.news_articles
FOR ALL TO authenticated
USING (public.has_role(auth.uid()::text, 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid()::text, 'admin'::app_role));

CREATE POLICY "Sellers can upload product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid()::text, 'seller'::app_role));

-- Drop overly-permissive policies
DROP POLICY IF EXISTS "Allow all on admin_logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Allow all on seller_profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Allow all on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all on salah_log" ON public.salah_log;
DROP POLICY IF EXISTS "Allow all on salah_streaks" ON public.salah_streaks;
DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all on order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow all on hajj_bookings" ON public.hajj_bookings;
DROP POLICY IF EXISTS "Allow all on hajj_trips" ON public.hajj_trips;
DROP POLICY IF EXISTS "Allow all on guftagu_posts" ON public.guftagu_posts;
DROP POLICY IF EXISTS "Allow all on guftagu_likes" ON public.guftagu_likes;
DROP POLICY IF EXISTS "Allow all on guftagu_replies" ON public.guftagu_replies;
DROP POLICY IF EXISTS "Allow all on products" ON public.products;
DROP POLICY IF EXISTS "Allow all on product_images" ON public.product_images;

-- admin_logs
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
FOR SELECT TO authenticated USING (public.has_role(auth.uid()::text, 'admin'::app_role));
CREATE POLICY "Admins can insert admin logs" ON public.admin_logs
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid()::text, 'admin'::app_role));

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can delete own profile" ON public.profiles
FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- salah_log / salah_streaks
CREATE POLICY "Users manage own salah_log" ON public.salah_log
FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users manage own salah_streaks" ON public.salah_streaks
FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- seller_profiles
CREATE POLICY "Sellers manage own profile" ON public.seller_profiles
FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- orders + order_items
CREATE POLICY "Users manage own orders" ON public.orders
FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Sellers can view their orders" ON public.orders
FOR SELECT TO authenticated USING (seller_id = auth.uid()::text);

CREATE POLICY "Users manage own order items" ON public.order_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()::text))
WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()::text));
CREATE POLICY "Sellers can view their order items" ON public.order_items
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.seller_id = auth.uid()::text));

-- hajj_bookings
CREATE POLICY "Users manage own hajj bookings" ON public.hajj_bookings
FOR ALL TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- hajj_trips
CREATE POLICY "Anyone can view active hajj trips" ON public.hajj_trips FOR SELECT USING (is_active = true);
CREATE POLICY "Travel partners view own trips" ON public.hajj_trips
FOR SELECT TO authenticated USING (travel_partner_id = auth.uid()::text);
CREATE POLICY "Travel partners insert own trips" ON public.hajj_trips
FOR INSERT TO authenticated
WITH CHECK (travel_partner_id = auth.uid()::text AND public.has_role(auth.uid()::text, 'travel_partner'::app_role));
CREATE POLICY "Travel partners update own trips" ON public.hajj_trips
FOR UPDATE TO authenticated USING (travel_partner_id = auth.uid()::text) WITH CHECK (travel_partner_id = auth.uid()::text);
CREATE POLICY "Travel partners delete own trips" ON public.hajj_trips
FOR DELETE TO authenticated USING (travel_partner_id = auth.uid()::text);

-- products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Sellers view own products" ON public.products
FOR SELECT TO authenticated USING (seller_id = auth.uid()::text);
CREATE POLICY "Sellers insert own products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (seller_id = auth.uid()::text AND public.has_role(auth.uid()::text, 'seller'::app_role));
CREATE POLICY "Sellers update own products" ON public.products
FOR UPDATE TO authenticated USING (seller_id = auth.uid()::text) WITH CHECK (seller_id = auth.uid()::text);
CREATE POLICY "Sellers delete own products" ON public.products
FOR DELETE TO authenticated USING (seller_id = auth.uid()::text);

-- product_images
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Sellers insert own product images" ON public.product_images
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.seller_id = auth.uid()::text));
CREATE POLICY "Sellers update own product images" ON public.product_images
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.seller_id = auth.uid()::text))
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.seller_id = auth.uid()::text));
CREATE POLICY "Sellers delete own product images" ON public.product_images
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.seller_id = auth.uid()::text));

-- guftagu
CREATE POLICY "Anyone can view guftagu posts" ON public.guftagu_posts FOR SELECT USING (true);
CREATE POLICY "Users create own guftagu posts" ON public.guftagu_posts
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users update own guftagu posts" ON public.guftagu_posts
FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users delete own guftagu posts" ON public.guftagu_posts
FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Anyone can view guftagu replies" ON public.guftagu_replies FOR SELECT USING (true);
CREATE POLICY "Users create own guftagu replies" ON public.guftagu_replies
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users update own guftagu replies" ON public.guftagu_replies
FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users delete own guftagu replies" ON public.guftagu_replies
FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Anyone can view guftagu likes" ON public.guftagu_likes FOR SELECT USING (true);
CREATE POLICY "Users create own guftagu likes" ON public.guftagu_likes
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users delete own guftagu likes" ON public.guftagu_likes
FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- Storage: remove public listing on product-images
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
