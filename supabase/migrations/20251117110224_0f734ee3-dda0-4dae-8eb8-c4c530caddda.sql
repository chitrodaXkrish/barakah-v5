-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

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