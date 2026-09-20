import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://yjweaetagnlafypgtckf.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqd2VhZXRhZ25sYWZ5cGd0Y2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMzE0NzIsImV4cCI6MjEwMTgwNzQ3Mn0.Of_ayaYLR-JrVLJGjD60CF4kFTxDz2i24OYxRv_vMiI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
