-- Add category column to guftagu_posts table
ALTER TABLE public.guftagu_posts 
ADD COLUMN category text DEFAULT 'general';

-- Create index for category filtering
CREATE INDEX idx_guftagu_posts_category ON public.guftagu_posts(category);