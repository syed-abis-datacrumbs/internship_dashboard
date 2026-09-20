-- ===================================================
-- Supabase SQL Schema for DataCrumbs Internship Candidates
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yjweaetagnlafypgtckf/sql/new
-- ===================================================

CREATE TABLE IF NOT EXISTS public.candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  domain TEXT,
  university TEXT,
  score INT DEFAULT 85,
  status TEXT DEFAULT 'OFFER_SENT',
  offer_sent_date TEXT,
  response_date TEXT,
  reminder_sent_date TEXT,
  email_reply TEXT,
  reply_sent BOOLEAN DEFAULT false,
  reply_sent_date TEXT,
  last_sent_draft TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow full read & write access
DROP POLICY IF EXISTS "Allow public read access" ON public.candidates;
CREATE POLICY "Allow public read access" ON public.candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access" ON public.candidates;
CREATE POLICY "Allow public write access" ON public.candidates FOR ALL USING (true);
