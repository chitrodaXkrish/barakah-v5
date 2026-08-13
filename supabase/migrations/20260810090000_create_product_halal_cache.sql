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
