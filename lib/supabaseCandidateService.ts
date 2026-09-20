import { supabase } from './supabaseClient';
import { Candidate } from './types';

export function mapRowToCandidate(row: any): Candidate {
  const reminderCount = row.reminder_count !== undefined && row.reminder_count !== null
    ? row.reminder_count
    : (row.reminder_sent_date ? 1 : 0);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    domain: row.domain,
    university: row.university,
    score: row.score || 85,
    status: row.status || 'OFFER_SENT',
    offerSentDate: row.offer_sent_date,
    responseDate: row.response_date,
    reminderSentDate: row.reminder_sent_date,
    reminderCount: reminderCount,
    emailReply: row.email_reply,
    replySent: row.reply_sent,
    replySentDate: row.reply_sent_date,
    lastSentDraft: row.last_sent_draft,
    aiAnalysis: row.ai_analysis
  };
}

export function mapCandidateToRow(cand: Partial<Candidate>): any {
  const row: any = {};
  if (cand.id !== undefined) row.id = cand.id;
  if (cand.name !== undefined) row.name = cand.name;
  if (cand.email !== undefined) row.email = cand.email;
  if (cand.domain !== undefined) row.domain = cand.domain;
  if (cand.university !== undefined) row.university = cand.university;
  if (cand.score !== undefined) row.score = cand.score;
  if (cand.status !== undefined) row.status = cand.status;
  if (cand.offerSentDate !== undefined) row.offer_sent_date = cand.offerSentDate;
  if (cand.responseDate !== undefined) row.response_date = cand.responseDate;
  if (cand.reminderSentDate !== undefined) row.reminder_sent_date = cand.reminderSentDate;
  if (cand.reminderCount !== undefined) row.reminder_count = cand.reminderCount;
  if (cand.emailReply !== undefined) row.email_reply = cand.emailReply;
  if (cand.replySent !== undefined) row.reply_sent = cand.replySent;
  if (cand.replySentDate !== undefined) row.reply_sent_date = cand.replySentDate;
  if (cand.lastSentDraft !== undefined) row.last_sent_draft = cand.lastSentDraft;
  if (cand.aiAnalysis !== undefined) row.ai_analysis = cand.aiAnalysis;
  return row;
}

export async function getCandidatesFromSupabase(): Promise<Candidate[] | null> {
  try {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, email, domain, university, score, status, offer_sent_date, response_date, reminder_sent_date, reply_sent, reply_sent_date')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }
    return data.map(mapRowToCandidate);
  } catch (e) {
    console.error('Error fetching candidates from Supabase:', e);
    return null;
  }
}

export async function upsertCandidateToSupabase(cand: Partial<Candidate>): Promise<boolean> {
  try {
    const row = mapCandidateToRow(cand);
    const { error } = await supabase.from('candidates').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Supabase upsert error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error upserting candidate to Supabase:', e);
    return false;
  }
}
