export type OfferStatus = 'ACCEPTED' | 'DECLINED' | 'NEEDS_REVIEW' | 'OFFER_SENT' | 'PENDING';

export interface AIAnalysis {
  intent: 'ACCEPTED' | 'DECLINED' | 'QUESTION' | 'UNCERTAIN';
  confidence: number;
  summary: string;
  keyPoints: string[];
  recommendedStatus: OfferStatus;
  analyzedAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  domain: string;
  university: string;
  score?: number;
  status: OfferStatus;
  offerSentDate: string;
  responseDate?: string;
  reminderSentDate?: string;
  reminderCount?: number;
  emailReply?: string;
  aiAnalysis?: AIAnalysis;
  replySent?: boolean;
  replySentDate?: string;
  lastSentDraft?: string;
  whatsappSent?: boolean;
  whatsappSentDate?: string;
}

export interface UserSession {
  email: string;
  name: string;
  role: string;
  isLoggedIn: boolean;
}
