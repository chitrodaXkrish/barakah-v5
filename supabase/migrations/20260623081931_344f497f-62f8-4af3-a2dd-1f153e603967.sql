
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
