-- Create marketplace_waitlist table
CREATE TABLE marketplace_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (email)
);

-- Enable RLS
ALTER TABLE marketplace_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (signup)
CREATE POLICY "Anyone can insert marketplace waitlist entries"
  ON marketplace_waitlist
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own entries
CREATE POLICY "Users can view their own waitlist entries"
  ON marketplace_waitlist
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index on email for faster lookups
CREATE INDEX idx_marketplace_waitlist_email ON marketplace_waitlist(email);

-- Create index on user_id for queries
CREATE INDEX idx_marketplace_waitlist_user_id ON marketplace_waitlist(user_id);
