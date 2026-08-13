-- Full schema dump for a clean Barakah Supabase project.
-- Run this only on a fresh/empty project, not on a project that already has Barakah tables.


-- -----------------------------------------------------------------------------
-- supabase/migrations/20251108102843_00e45818-d2e6-4140-934c-ccf52bb5af3b.sql
-- -----------------------------------------------------------------------------

-- Create enum for user roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('normal_user', 'seller', 'travel_partner');
  END IF;
END;
$$;

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS Policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- supabase/migrations/20251108102915_6aef5ed7-6005-4c2f-8eda-608a6e34d3ce.sql
-- -----------------------------------------------------------------------------

-- Fix search path for handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20251108103415_a2e6f3cd-f311-46c2-a977-3e8590f53146.sql
-- -----------------------------------------------------------------------------

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    inventory_quantity INTEGER NOT NULL DEFAULT 0 CHECK (inventory_quantity >= 0),
    category TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Sellers can view their own products"
ON public.products
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = seller_id 
    AND public.has_role(auth.uid(), 'seller')
);

CREATE POLICY "Sellers can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products"
ON public.products
FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- RLS Policies for product images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Sellers can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'seller')
);

CREATE POLICY "Sellers can update their product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Sellers can delete their product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20251117110030_112d51b0-9606-439b-bb84-87888bf15a07.sql
-- -----------------------------------------------------------------------------

-- Add admin role to existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- -----------------------------------------------------------------------------
-- supabase/migrations/20251117110224_0f734ee3-dda0-4dae-8eb8-c4c530caddda.sql
-- -----------------------------------------------------------------------------

-- Create enum for order status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'order_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
  END IF;
END;
$$;

-- Create enum for booking status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'booking_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
  END IF;
END;
$$;

-- Create salah_log table for prayer tracking
CREATE TABLE public.salah_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  fajr BOOLEAN NOT NULL DEFAULT false,
  dhuhr BOOLEAN NOT NULL DEFAULT false,
  asr BOOLEAN NOT NULL DEFAULT false,
  maghrib BOOLEAN NOT NULL DEFAULT false,
  isha BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create salah_streaks table for tracking prayer streaks
CREATE TABLE public.salah_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_image table for multiple product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hajj_trips table
CREATE TABLE public.hajj_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  slots_available INTEGER NOT NULL CHECK (slots_available >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hajj_bookings table
CREATE TABLE public.hajj_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.hajj_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  amount_paid NUMERIC(12, 2) NOT NULL,
  booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_logs table
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.salah_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salah_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hajj_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hajj_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salah_log
CREATE POLICY "Users can view their own salah logs"
  ON public.salah_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own salah logs"
  ON public.salah_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salah logs"
  ON public.salah_log FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for salah_streaks
CREATE POLICY "Users can view their own streaks"
  ON public.salah_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON public.salah_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON public.salah_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for product_images
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage their product images"
  ON public.product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE products.id = product_images.product_id 
      AND products.seller_id = auth.uid()
    )
  );

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can view orders containing their products"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = orders.id AND p.seller_id = auth.uid()
    )
  );

-- RLS Policies for order_items
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- RLS Policies for hajj_trips
CREATE POLICY "Anyone can view active hajj trips"
  ON public.hajj_trips FOR SELECT
  USING (is_active = true);

CREATE POLICY "Travel partners can view their own trips"
  ON public.hajj_trips FOR SELECT
  USING (auth.uid() = travel_partner_id);

CREATE POLICY "Travel partners can create trips"
  ON public.hajj_trips FOR INSERT
  WITH CHECK (auth.uid() = travel_partner_id AND public.has_role(auth.uid(), 'travel_partner'));

CREATE POLICY "Travel partners can update their own trips"
  ON public.hajj_trips FOR UPDATE
  USING (auth.uid() = travel_partner_id);

CREATE POLICY "Travel partners can delete their own trips"
  ON public.hajj_trips FOR DELETE
  USING (auth.uid() = travel_partner_id);

-- RLS Policies for hajj_bookings
CREATE POLICY "Users can view their own bookings"
  ON public.hajj_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Travel partners can view bookings for their trips"
  ON public.hajj_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hajj_trips 
      WHERE hajj_trips.id = hajj_bookings.trip_id 
      AND hajj_trips.travel_partner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own bookings"
  ON public.hajj_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.hajj_bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for admin_logs (admin only)
CREATE POLICY "Only admins can view logs"
  ON public.admin_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert logs"
  ON public.admin_logs FOR INSERT
  WITH CHECK (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_salah_log_user_date ON public.salah_log(user_id, date DESC);
CREATE INDEX idx_salah_streaks_user ON public.salah_streaks(user_id);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);
CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_hajj_trips_partner ON public.hajj_trips(travel_partner_id);
CREATE INDEX idx_hajj_bookings_trip ON public.hajj_bookings(trip_id);
CREATE INDEX idx_hajj_bookings_user ON public.hajj_bookings(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hajj_trips_updated_at
  BEFORE UPDATE ON public.hajj_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hajj_bookings_updated_at
  BEFORE UPDATE ON public.hajj_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- supabase/migrations/20251225175813_2012c553-7fbf-430e-a5e0-02006f2258af.sql
-- -----------------------------------------------------------------------------

-- Create posts table for Guftagu
CREATE TABLE public.guftagu_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create replies table
CREATE TABLE public.guftagu_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.guftagu_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guftagu_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guftagu_replies ENABLE ROW LEVEL SECURITY;

-- Posts policies: Any authenticated user can view all posts
CREATE POLICY "Anyone can view posts" 
ON public.guftagu_posts 
FOR SELECT 
USING (true);

-- Users can create their own posts
CREATE POLICY "Users can create posts" 
ON public.guftagu_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON public.guftagu_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Replies policies: Anyone can view replies
CREATE POLICY "Anyone can view replies" 
ON public.guftagu_replies 
FOR SELECT 
USING (true);

-- Any authenticated user can reply
CREATE POLICY "Users can create replies" 
ON public.guftagu_replies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own replies
CREATE POLICY "Users can delete their own replies" 
ON public.guftagu_replies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.guftagu_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guftagu_replies;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260111173232_64a4b2a2-bd13-464b-8b9f-e860e459710a.sql
-- -----------------------------------------------------------------------------

-- Create a table for post likes
CREATE TABLE public.guftagu_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.guftagu_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.guftagu_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for likes
CREATE POLICY "Anyone can view likes" 
ON public.guftagu_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can like posts" 
ON public.guftagu_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
ON public.guftagu_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime for likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.guftagu_likes;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260113143908_305dc0f8-6e7d-401d-aeaa-8cef69aeb07b.sql
-- -----------------------------------------------------------------------------

-- Add category column to guftagu_posts table
ALTER TABLE public.guftagu_posts 
ADD COLUMN category text DEFAULT 'general';

-- Create index for category filtering
CREATE INDEX idx_guftagu_posts_category ON public.guftagu_posts(category);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260118143711_ad192e0a-11ca-407c-ab83-598106e07119.sql
-- -----------------------------------------------------------------------------

-- Step 1: Drop ALL existing RLS policies

-- admin_logs
DROP POLICY IF EXISTS "Only admins can insert logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Only admins can view logs" ON public.admin_logs;

-- guftagu_likes
DROP POLICY IF EXISTS "Anyone can view likes" ON public.guftagu_likes;
DROP POLICY IF EXISTS "Authenticated users can like posts" ON public.guftagu_likes;
DROP POLICY IF EXISTS "Users can remove their own likes" ON public.guftagu_likes;

-- guftagu_posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.guftagu_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.guftagu_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.guftagu_posts;

-- guftagu_replies
DROP POLICY IF EXISTS "Anyone can view replies" ON public.guftagu_replies;
DROP POLICY IF EXISTS "Users can create replies" ON public.guftagu_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON public.guftagu_replies;

-- hajj_bookings
DROP POLICY IF EXISTS "Travel partners can view bookings for their trips" ON public.hajj_bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.hajj_bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.hajj_bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.hajj_bookings;

-- hajj_trips
DROP POLICY IF EXISTS "Anyone can view active hajj trips" ON public.hajj_trips;
DROP POLICY IF EXISTS "Travel partners can create trips" ON public.hajj_trips;
DROP POLICY IF EXISTS "Travel partners can delete their own trips" ON public.hajj_trips;
DROP POLICY IF EXISTS "Travel partners can update their own trips" ON public.hajj_trips;
DROP POLICY IF EXISTS "Travel partners can view their own trips" ON public.hajj_trips;

-- order_items
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;

-- orders
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- product_images
DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Sellers can manage their product images" ON public.product_images;

-- products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can view their own products" ON public.products;

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- salah_log
DROP POLICY IF EXISTS "Users can insert their own salah logs" ON public.salah_log;
DROP POLICY IF EXISTS "Users can update their own salah logs" ON public.salah_log;
DROP POLICY IF EXISTS "Users can view their own salah logs" ON public.salah_log;

-- salah_streaks
DROP POLICY IF EXISTS "Users can insert their own streaks" ON public.salah_streaks;
DROP POLICY IF EXISTS "Users can update their own streaks" ON public.salah_streaks;
DROP POLICY IF EXISTS "Users can view their own streaks" ON public.salah_streaks;

-- user_roles
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260118143730_9d38bce3-8e6c-466a-95e3-c2156f57665a.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260509132205_b684c73e-71b8-4662-abb7-10d6dd9b7e74.sql
-- -----------------------------------------------------------------------------


CREATE TABLE public.news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  rss_url text NOT NULL,
  category text DEFAULT 'world',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guid text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  content text,
  image_url text,
  article_url text NOT NULL,
  source_name text NOT NULL,
  published_at timestamptz,
  author text,
  category text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_published_at ON public.news_articles (published_at DESC);
CREATE INDEX idx_news_articles_category ON public.news_articles (category);
CREATE INDEX idx_news_articles_source ON public.news_articles (source_name);

ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active news sources"
  ON public.news_sources FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage news sources"
  ON public.news_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view news articles"
  ON public.news_articles FOR SELECT USING (true);

CREATE POLICY "Admins can manage news articles"
  ON public.news_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON public.news_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.news_sources (name, rss_url, category) VALUES
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world'),
  ('Middle East Eye', 'https://www.middleeasteye.net/rss', 'world'),
  ('Islamic Relief Worldwide', 'https://islamic-relief.org/feed/', 'charity'),
  ('TRT World', 'https://www.trtworld.com/rss', 'world');

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260623080547_5298b74c-4f7f-4122-ba51-33e32870a5d4.sql
-- -----------------------------------------------------------------------------


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

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260623081931_344f497f-62f8-4af3-a2dd-1f153e603967.sql
-- -----------------------------------------------------------------------------


-- Extend products with seller fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'KG',
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipping_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS islamic_compliance BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Extend orders with shipping/customer fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS tracking_id TEXT,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Allow new order_status values used in seller flow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='new' AND enumtypid='order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'new';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='processing' AND enumtypid='order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'processing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='shipped' AND enumtypid='order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'shipped';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='completed' AND enumtypid='order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'completed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='declined' AND enumtypid='order_status'::regtype) THEN
    ALTER TYPE order_status ADD VALUE 'declined';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260628172551_73fac55f-9c23-4748-aa9d-56b6c95015f8.sql
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260629152915_129b273c-9871-496f-b239-812f7208f48c.sql
-- -----------------------------------------------------------------------------

ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS main_use TEXT,
  ADD COLUMN IF NOT EXISTS one_improvement TEXT,
  ADD COLUMN IF NOT EXISTS first_open_confusion TEXT,
  ADD COLUMN IF NOT EXISTS notifications_timing TEXT,
  ADD COLUMN IF NOT EXISTS state_country TEXT;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260630060527_76808dff-da47-4bc1-9100-c408a24d028e.sql
-- -----------------------------------------------------------------------------

ALTER TABLE public.app_feedback ADD COLUMN IF NOT EXISTS user_email TEXT;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260709145714_1836b9ef-6881-476d-ab07-8c61f8b76834.sql
-- -----------------------------------------------------------------------------


CREATE TABLE public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_user_id_idx ON public.chat_threads(user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO anon, authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on chat_threads" ON public.chat_threads FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER chat_threads_updated_at BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260713142703_51952b22-0da1-4f73-a787-93e6967136c5.sql
-- -----------------------------------------------------------------------------


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

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260713173348_419b1621-05a4-411d-82b4-232cb01ad558.sql
-- -----------------------------------------------------------------------------

-- Firebase auth means Supabase's auth.uid() is null; role/profile lookups after sign-in must work without a Supabase session.
-- Restore anon SELECT while keeping writes restricted.

GRANT SELECT ON public.user_roles TO anon;
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Anyone can read user_roles"
ON public.user_roles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Anyone can read profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260715172625_e28a43ef-8caa-4774-8e87-8c3d4bf8bb1b.sql
-- -----------------------------------------------------------------------------

CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260716090743_393dfa5e-42c3-4141-be96-5747c8e2a727.sql
-- -----------------------------------------------------------------------------


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

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260716090803_c763d85b-76d6-4a02-992f-14d8f935a28c.sql
-- -----------------------------------------------------------------------------


DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.app_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.app_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = (auth.uid())::text);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260725093000_create_user_role_on_auth_signup.sql
-- -----------------------------------------------------------------------------

-- Create profile and role rows from the auth signup event.
-- This avoids client-side inserts during signup, which can fail RLS when
-- email confirmation is enabled and no authenticated session exists yet.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  safe_role public.app_role;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'normal_user');

  safe_role := CASE requested_role
    WHEN 'seller' THEN 'seller'::public.app_role
    WHEN 'travel_partner' THEN 'travel_partner'::public.app_role
    ELSE 'normal_user'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id::text, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id::text,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'), '')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile_role ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();


-- -----------------------------------------------------------------------------
-- supabase/migrations/20260801090000_add_guftagu_post_images.sql
-- -----------------------------------------------------------------------------

ALTER TABLE public.guftagu_posts
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260802090000_add_quran_read_to_salah_log.sql
-- -----------------------------------------------------------------------------

ALTER TABLE public.salah_log
ADD COLUMN IF NOT EXISTS quran_read BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260803090000_add_complete_account_setup_rpc.sql
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_account_setup(_role public.app_role, _full_name text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id text;
  clean_full_name text;
BEGIN
  current_user_id := auth.uid()::text;
  clean_full_name := NULLIF(BTRIM(_full_name), '');

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to complete setup.';
  END IF;

  IF clean_full_name IS NULL THEN
    RAISE EXCEPTION 'Please enter your full name.';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (current_user_id, clean_full_name)
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

  RETURN _role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_account_setup(public.app_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_account_setup(public.app_role, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260803100000_seed_news_sources_sections.sql
-- -----------------------------------------------------------------------------

INSERT INTO public.news_sources (name, rss_url, category, is_active)
VALUES
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world', true),
  ('Middle East Eye', 'https://www.middleeasteye.net/rss', 'world', true),
  ('TRT World', 'https://www.trtworld.com/rss', 'world', true),
  ('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world', true),
  ('Islamic Relief Worldwide', 'https://islamic-relief.org/feed/', 'charity', true),
  ('Islamic Relief Press Releases', 'https://islamic-relief.org/news_category/press-releases/feed/', 'charity', true),
  ('Muslim Matters', 'https://muslimmatters.org/feed/', 'education', true),
  ('BBC Education', 'https://feeds.bbci.co.uk/news/education/rss.xml', 'education', true),
  ('About Islam', 'https://aboutislam.net/feed/', 'community', true),
  ('The Muslim Vibe', 'https://themuslimvibe.com/feed/', 'community', true),
  ('Islamic Finance Guru', 'https://www.islamicfinanceguru.com/feed/', 'business', true),
  ('BBC Business', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'business', true),
  ('BBC Politics', 'https://feeds.bbci.co.uk/news/politics/rss.xml', 'politics', true),
  ('Middle East Eye Politics', 'https://www.middleeasteye.net/rss', 'politics', true)
ON CONFLICT (name) DO UPDATE
SET
  rss_url = EXCLUDED.rss_url,
  category = EXCLUDED.category,
  is_active = true,
  updated_at = now();

UPDATE public.news_sources
SET is_active = false, updated_at = now()
WHERE rss_url ILIKE 'https://news.google.com/rss/search%';

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260810090000_create_product_halal_cache.sql
-- -----------------------------------------------------------------------------

-- Phase 2: Canonical product halal result cache.
-- One row per normalized barcode, shared across all users.
-- scan_history remains the per-user scan log.

CREATE TABLE IF NOT EXISTS public.product_halal_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_barcode TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  brand TEXT,
  status TEXT NOT NULL CHECK (status IN ('halal', 'haram', 'mushbooh', 'unknown')),
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  verdict TEXT,
  ingredients JSONB NOT NULL,
  ingredients_hash TEXT NOT NULL,
  source TEXT,
  rules_version TEXT DEFAULT 'halal-rules-v1',
  ai_model TEXT,
  ai_prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_halal_cache_status_idx
  ON public.product_halal_cache(status);

CREATE INDEX IF NOT EXISTS product_halal_cache_ingredients_hash_idx
  ON public.product_halal_cache(ingredients_hash);

CREATE INDEX IF NOT EXISTS product_halal_cache_rules_version_idx
  ON public.product_halal_cache(rules_version);

GRANT SELECT ON public.product_halal_cache TO authenticated, anon;
GRANT ALL ON public.product_halal_cache TO service_role;

ALTER TABLE public.product_halal_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read product halal cache"
  ON public.product_halal_cache;

CREATE POLICY "Authenticated can read product halal cache"
  ON public.product_halal_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- scan_history: add nullable FK to the canonical cache when that table exists.
-- Some checkouts/projects do not include scan_history, so keep this dump replayable.
DO $$
BEGIN
  IF to_regclass('public.scan_history') IS NOT NULL THEN
    ALTER TABLE public.scan_history
      ADD COLUMN IF NOT EXISTS product_cache_id UUID
      REFERENCES public.product_halal_cache(id)
      ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS scan_history_product_cache_id_idx
      ON public.scan_history(product_cache_id);
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813090000_create_guftagu_communities.sql
-- -----------------------------------------------------------------------------

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  image_url text,
  category text not null default 'ummah',
  created_by uuid not null references auth.users(id) on delete cascade,
  member_count integer not null default 1,
  post_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamp with time zone not null default now(),
  unique (community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  unique (post_id, user_id)
);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.post_likes enable row level security;

drop policy if exists "Anyone can read communities" on public.communities;
create policy "Anyone can read communities" on public.communities
for select using (true);

drop policy if exists "Authenticated users can create communities" on public.communities;
create policy "Authenticated users can create communities" on public.communities
for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Creators can update their communities" on public.communities;
create policy "Creators can update their communities" on public.communities
for update to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Anyone can read community members" on public.community_members;
create policy "Anyone can read community members" on public.community_members
for select using (true);

drop policy if exists "Users can join communities" on public.community_members;
create policy "Users can join communities" on public.community_members
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read community posts" on public.community_posts;
create policy "Everyone can read community posts" on public.community_posts
for select using (true);

drop policy if exists "Authenticated users can create community posts" on public.community_posts;
create policy "Authenticated users can create community posts" on public.community_posts
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their community posts" on public.community_posts;
create policy "Users can delete their community posts" on public.community_posts
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read community comments" on public.community_comments;
create policy "Everyone can read community comments" on public.community_comments
for select using (true);

drop policy if exists "Authenticated users can create community comments" on public.community_comments;
create policy "Authenticated users can create community comments" on public.community_comments
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their community comments" on public.community_comments;
create policy "Users can delete their community comments" on public.community_comments
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Everyone can read post likes" on public.post_likes;
create policy "Everyone can read post likes" on public.post_likes
for select using (true);

drop policy if exists "Authenticated users can like community posts" on public.post_likes;
create policy "Authenticated users can like community posts" on public.post_likes
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike community posts" on public.post_likes;
create policy "Users can unlike community posts" on public.post_likes
for delete to authenticated
using (auth.uid() = user_id);

create index if not exists community_members_community_id_idx
  on public.community_members(community_id);

create index if not exists community_members_user_id_idx
  on public.community_members(user_id);

create index if not exists community_posts_community_created_idx
  on public.community_posts(community_id, created_at desc);

create index if not exists community_comments_post_created_idx
  on public.community_comments(post_id, created_at asc);

create index if not exists post_likes_post_id_idx
  on public.post_likes(post_id);

create or replace function public.refresh_community_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set member_count = (
      select count(*) from public.community_members where community_id = new.community_id
    )
    where id = new.community_id;
    return new;
  end if;

  update public.communities
  set member_count = (
    select count(*) from public.community_members where community_id = old.community_id
  )
  where id = old.community_id;
  return old;
end;
$$;

create or replace function public.refresh_community_post_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set post_count = (
      select count(*) from public.community_posts where community_id = new.community_id
    )
    where id = new.community_id;
    return new;
  end if;

  update public.communities
  set post_count = (
    select count(*) from public.community_posts where community_id = old.community_id
  )
  where id = old.community_id;
  return old;
end;
$$;

create or replace function public.refresh_community_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set comment_count = (
      select count(*) from public.community_comments where post_id = new.post_id
    )
    where id = new.post_id;
    return new;
  end if;

  update public.community_posts
  set comment_count = (
    select count(*) from public.community_comments where post_id = old.post_id
  )
  where id = old.post_id;
  return old;
end;
$$;

create or replace function public.refresh_community_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set like_count = (
      select count(*) from public.post_likes where post_id = new.post_id
    )
    where id = new.post_id;
    return new;
  end if;

  update public.community_posts
  set like_count = (
    select count(*) from public.post_likes where post_id = old.post_id
  )
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists refresh_community_member_count_trigger on public.community_members;
create trigger refresh_community_member_count_trigger
after insert or delete on public.community_members
for each row execute function public.refresh_community_member_count();

drop trigger if exists refresh_community_post_count_trigger on public.community_posts;
create trigger refresh_community_post_count_trigger
after insert or delete on public.community_posts
for each row execute function public.refresh_community_post_count();

drop trigger if exists refresh_community_comment_count_trigger on public.community_comments;
create trigger refresh_community_comment_count_trigger
after insert or delete on public.community_comments
for each row execute function public.refresh_community_comment_count();

drop trigger if exists refresh_community_like_count_trigger on public.post_likes;
create trigger refresh_community_like_count_trigger
after insert or delete on public.post_likes
for each row execute function public.refresh_community_like_count();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'communities'
  ) then
    alter publication supabase_realtime add table public.communities;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_comments'
  ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_members'
  ) then
    alter publication supabase_realtime add table public.community_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813091000_add_guftagu_community_admin_rights.sql
-- -----------------------------------------------------------------------------

drop policy if exists "Creators can delete their communities" on public.communities;
create policy "Creators can delete their communities" on public.communities
for delete to authenticated
using (auth.uid() = created_by);

drop policy if exists "Users can leave communities" on public.community_members;
create policy "Users can leave communities" on public.community_members
for delete to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "Users can delete their community posts" on public.community_posts;
drop policy if exists "Users and community owners can delete community posts" on public.community_posts;
create policy "Users and community owners can delete community posts" on public.community_posts
for delete to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.communities c
    where c.id = community_posts.community_id
      and c.created_by = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- supabase/migrations/20260813092000_create_email_notification_scan_tables.sql
-- -----------------------------------------------------------------------------

create table if not exists public.auth_email_otps (
  email text primary key,
  code_hash text not null,
  attempts integer not null default 0,
  last_sent_at timestamp with time zone,
  expires_at timestamp with time zone not null,
  verified_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  message_id text unique,
  template_name text,
  recipient_email text not null,
  status text not null default 'pending',
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_send_state (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  message_id text not null unique,
  idempotency_key text unique,
  recipient_email text,
  payload jsonb not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  last_attempt_at timestamp with time zone,
  next_attempt_at timestamp with time zone,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.email_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  email text not null,
  token_hash text not null unique,
  scope text not null default 'all',
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.suppressed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text,
  source text,
  suppressed_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  prayer_reminders boolean not null default true,
  community_updates boolean not null default true,
  marketplace_updates boolean not null default true,
  news_updates boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  quiet_hours_start time without time zone,
  quiet_hours_end time without time zone,
  timezone text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text not null,
  body text,
  type text not null default 'general',
  data jsonb not null default '{}'::jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token text not null unique,
  platform text,
  device_id text,
  is_active boolean not null default true,
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  product_name text not null default 'Unknown Product',
  brand text,
  status text not null default 'unknown' check (status in ('halal', 'haram', 'mushbooh', 'unknown')),
  confidence integer check (confidence between 0 and 100),
  verdict text,
  category text,
  region text,
  ingredients_hash text,
  product_cache_id uuid references public.product_halal_cache(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

create index if not exists auth_email_otps_expires_at_idx
  on public.auth_email_otps(expires_at);

create index if not exists email_send_log_recipient_created_idx
  on public.email_send_log(recipient_email, created_at desc);

create index if not exists email_send_state_status_next_attempt_idx
  on public.email_send_state(status, next_attempt_at);

create index if not exists email_unsubscribe_tokens_email_idx
  on public.email_unsubscribe_tokens(email);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens(user_id);

create index if not exists scan_history_created_idx
  on public.scan_history(created_at desc);

create index if not exists scan_history_product_cache_id_idx
  on public.scan_history(product_cache_id);

alter table public.auth_email_otps enable row level security;
alter table public.email_send_log enable row level security;
alter table public.email_send_state enable row level security;
alter table public.email_unsubscribe_tokens enable row level security;
alter table public.suppressed_emails enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.scan_history enable row level security;

drop policy if exists "Service role manages auth email otps" on public.auth_email_otps;
create policy "Service role manages auth email otps" on public.auth_email_otps
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages email send log" on public.email_send_log;
create policy "Service role manages email send log" on public.email_send_log
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages email send state" on public.email_send_state;
create policy "Service role manages email send state" on public.email_send_state
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages unsubscribe tokens" on public.email_unsubscribe_tokens;
create policy "Service role manages unsubscribe tokens" on public.email_unsubscribe_tokens
for all to service_role using (true) with check (true);

drop policy if exists "Service role manages suppressed emails" on public.suppressed_emails;
create policy "Service role manages suppressed emails" on public.suppressed_emails
for all to service_role using (true) with check (true);

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences" on public.notification_preferences
for select to authenticated using (user_id = auth.uid()::text);

drop policy if exists "Users insert own notification preferences" on public.notification_preferences;
create policy "Users insert own notification preferences" on public.notification_preferences
for insert to authenticated with check (user_id = auth.uid()::text);

drop policy if exists "Users update own notification preferences" on public.notification_preferences;
create policy "Users update own notification preferences" on public.notification_preferences
for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
for select to authenticated using (user_id = auth.uid()::text);

drop policy if exists "Service role creates notifications" on public.notifications;
create policy "Service role creates notifications" on public.notifications
for insert to service_role with check (true);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens" on public.push_tokens
for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

drop policy if exists "Users read own scan history" on public.scan_history;
create policy "Users read own scan history" on public.scan_history
for select to authenticated using (user_id is null or user_id = auth.uid()::text);

drop policy if exists "Service role creates scan history" on public.scan_history;
create policy "Service role creates scan history" on public.scan_history
for insert to service_role with check (true);

create or replace function public.enqueue_email(queue_name text, payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  payload_message_id text;
  payload_idempotency_key text;
begin
  payload_message_id := coalesce(payload->>'message_id', gen_random_uuid()::text);
  payload_idempotency_key := coalesce(payload->>'idempotency_key', payload_message_id);

  insert into public.email_send_state (
    queue_name,
    message_id,
    idempotency_key,
    recipient_email,
    payload,
    status,
    next_attempt_at
  )
  values (
    queue_name,
    payload_message_id,
    payload_idempotency_key,
    payload->>'to',
    payload,
    'queued',
    now()
  )
  on conflict (idempotency_key) do update
  set
    payload = excluded.payload,
    updated_at = now()
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke execute on function public.enqueue_email(text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_email(text, jsonb) to service_role;
