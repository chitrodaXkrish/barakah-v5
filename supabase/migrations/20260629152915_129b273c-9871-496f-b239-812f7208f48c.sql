ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS main_use TEXT,
  ADD COLUMN IF NOT EXISTS one_improvement TEXT,
  ADD COLUMN IF NOT EXISTS first_open_confusion TEXT,
  ADD COLUMN IF NOT EXISTS notifications_timing TEXT,
  ADD COLUMN IF NOT EXISTS state_country TEXT;