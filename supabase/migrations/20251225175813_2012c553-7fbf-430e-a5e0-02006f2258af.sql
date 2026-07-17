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