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