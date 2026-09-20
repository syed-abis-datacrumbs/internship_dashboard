const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjweaetagnlafypgtckf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqd2VhZXRhZ25sYWZ5cGd0Y2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMzE0NzIsImV4cCI6MjEwMTgwNzQ3Mn0.Of_ayaYLR-JrVLJGjD60CF4kFTxDz2i24OYxRv_vMiI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateCandidates() {
  console.log("Loading candidates from candidates_store.json...");
  const jsonPath = path.join(__dirname, '..', 'candidates_store.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const candidates = JSON.parse(rawData);

  console.log(`Total candidates to migrate: ${candidates.length}`);

  // Format candidate records for Supabase database table
  const formattedRows = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    domain: c.domain,
    university: c.university,
    score: c.score || 85,
    status: c.status || 'OFFER_SENT',
    offer_sent_date: c.offerSentDate || '2026-09-15',
    response_date: c.responseDate || null,
    reminder_sent_date: c.reminderSentDate || null,
    email_reply: c.emailReply || null,
    reply_sent: c.replySent || false,
    reply_sent_date: c.replySentDate || null,
    last_sent_draft: c.lastSentDraft || null,
    ai_analysis: c.aiAnalysis || null
  }));

  // Batch insert into Supabase in chunks of 50
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < formattedRows.length; i += chunkSize) {
    const chunk = formattedRows.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('candidates').upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error(`Error migrating chunk ${i / chunkSize + 1}:`, error.message);
      if (error.message.includes('relation "public.candidates" does not exist')) {
        console.log("\n⚠️ Table 'candidates' does not exist yet in Supabase!");
        console.log("Please run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/yjweaetagnlafypgtckf/sql/new):\n");
        console.log(`
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and public access policy
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update access" ON public.candidates FOR ALL USING (true);
        `);
        process.exit(1);
      }
    } else {
      successCount += chunk.length;
      console.log(`Successfully migrated ${successCount}/${formattedRows.length} candidates to Supabase...`);
    }
  }

  console.log(`\n🎉 Migration Complete! Total ${successCount} candidates synced to Supabase.`);
}

migrateCandidates();
