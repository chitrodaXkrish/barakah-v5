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