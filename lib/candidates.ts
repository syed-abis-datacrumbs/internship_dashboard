import fs from 'fs';
import path from 'path';
import { Candidate, OfferStatus } from './types';
import { syncAcceptedCandidateToSheets } from './googleSheets';
import { upsertCandidateToSupabase } from './supabaseCandidateService';

const STORE_PATH = path.join(process.cwd(), 'candidates_store.json');

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand-1',
    name: 'Syed Abdullah Haider Gardezi',
    email: 'abdullah.haider@gmail.com',
    domain: 'AI & Data Science',
    university: 'NUST',
    score: 95,
    status: 'ACCEPTED',
    offerSentDate: '2026-09-14',
    responseDate: '2026-09-15',
    emailReply: 'Dear HR, I am thrilled to accept the offer for the AI & Data Science Internship! Looking forward to starting.',
    aiAnalysis: {
      intent: 'ACCEPTED',
      confidence: 0.99,
      summary: 'Candidate explicitly accepted the internship offer with enthusiasm.',
      keyPoints: ['Confirmed acceptance', 'Expressed excitement for AI role'],
      recommendedStatus: 'ACCEPTED',
      analyzedAt: '2026-09-15T10:00:00Z'
    }
  },
  {
    id: 'cand-2',
    name: 'Falak Sher',
    email: 'falak.sher@example.com',
    domain: 'Full Stack Web Development',
    university: 'FAST NUCES',
    score: 92,
    status: 'ACCEPTED',
    offerSentDate: '2026-09-15',
    responseDate: '2026-09-16',
    emailReply: 'Thank you for sending the offer letter. I confirm my acceptance for the Web Dev internship.',
    aiAnalysis: {
      intent: 'ACCEPTED',
      confidence: 0.98,
      summary: 'Candidate confirmed acceptance for Full Stack Web Development role.',
      keyPoints: ['Offer accepted', 'Confirmed terms'],
      recommendedStatus: 'ACCEPTED',
      analyzedAt: '2026-09-16T11:20:00Z'
    }
  },
  {
    id: 'cand-3',
    name: 'Ayesha Malik',
    email: 'ayesha.m@domain.com',
    domain: 'UI/UX Design',
    university: 'COMSATS',
    score: 88,
    status: 'NEEDS_REVIEW',
    offerSentDate: '2026-09-16',
    responseDate: '2026-09-17',
    emailReply: 'Hi, I received the offer! Can you please clarify if the working hours are flexible during university exam week?',
    aiAnalysis: {
      intent: 'QUESTION',
      confidence: 0.85,
      summary: 'Candidate asked a clarifying question regarding remote work flexibility during exam week before confirming.',
      keyPoints: ['Inquired about exam week flexibility', 'Has not declined'],
      recommendedStatus: 'NEEDS_REVIEW',
      analyzedAt: '2026-09-17T09:15:00Z'
    }
  },
  {
    id: 'cand-4',
    name: 'Bilal Hassan',
    email: 'bilal.h@gmail.com',
    domain: 'Cyber Security',
    university: 'GIKI',
    score: 86,
    status: 'DECLINED',
    offerSentDate: '2026-09-14',
    responseDate: '2026-09-15',
    emailReply: 'Thank you for the offer. Unfortunately, I have accepted another full-time offer and must decline.',
    aiAnalysis: {
      intent: 'DECLINED',
      confidence: 0.99,
      summary: 'Candidate declined the offer due to accepting another role.',
      keyPoints: ['Declined internship', 'Accepted alternative offer'],
      recommendedStatus: 'DECLINED',
      analyzedAt: '2026-09-15T14:30:00Z'
    }
  }
];

export function getCandidates(): Candidate[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading candidates_store.json:', e);
  }
  saveCandidates(INITIAL_CANDIDATES);
  return INITIAL_CANDIDATES;
}

export function saveCandidates(candidates: Candidate[]) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(candidates, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving candidates_store.json:', e);
  }
}

export function updateCandidate(id: string, updates: Partial<Candidate>): Candidate | null {
  const list = getCandidates();
  const index = list.findIndex((c) => c.id === id || c.email.toLowerCase() === updates.email?.toLowerCase());

  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    saveCandidates(list);

    // Trigger Real-Time Supabase database update
    upsertCandidateToSupabase(list[index]).catch((err) =>
      console.error('Background Supabase update error:', err)
    );

    // Trigger Real-Time Google Sheets Sync asynchronously if ACCEPTED
    if (list[index].status === 'ACCEPTED') {
      syncAcceptedCandidateToSheets(list[index]).catch((err) =>
        console.error('Background Google Sheets sync error:', err)
      );
    }

    return list[index];
  }
  return null;
}

export function addCandidate(candidate: Omit<Candidate, 'id'>): Candidate {
  const list = getCandidates();
  
  // Check if candidate already exists by email
  const existingIndex = list.findIndex((c) => c.email.toLowerCase() === candidate.email.toLowerCase());
  if (existingIndex !== -1) {
    list[existingIndex] = { ...list[existingIndex], ...candidate };
    saveCandidates(list);

    // Trigger Real-Time Supabase database update
    upsertCandidateToSupabase(list[existingIndex]).catch((err) =>
      console.error('Background Supabase update error:', err)
    );

    // Trigger Real-Time Google Sheets Sync asynchronously if ACCEPTED
    if (list[existingIndex].status === 'ACCEPTED') {
      syncAcceptedCandidateToSheets(list[existingIndex]).catch((err) =>
        console.error('Background Google Sheets sync error:', err)
      );
    }

    return list[existingIndex];
  }

  const newCand: Candidate = {
    ...candidate,
    id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
  list.unshift(newCand);
  saveCandidates(list);

  // Trigger Real-Time Supabase database update
  upsertCandidateToSupabase(newCand).catch((err) =>
    console.error('Background Supabase insert error:', err)
  );

  // Trigger Real-Time Google Sheets Sync asynchronously if ACCEPTED
  if (newCand.status === 'ACCEPTED') {
    syncAcceptedCandidateToSheets(newCand).catch((err) =>
      console.error('Background Google Sheets sync error:', err)
    );
  }

  return newCand;
}
