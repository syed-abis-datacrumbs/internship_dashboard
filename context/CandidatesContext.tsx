'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Candidate } from '@/lib/types';

interface CandidatesContextType {
  candidates: Candidate[];
  loading: boolean;
  syncingInbox: boolean;
  batchProcessing: boolean;
  refreshCandidates: (force?: boolean) => Promise<void>;
  updateCandidateInContext: (id: string, updates: Partial<Candidate>) => void;
  addCandidateInContext: (newCand: Candidate) => void;
  handleSyncInbox: () => Promise<void>;
  handleBatchAnalyze: () => Promise<void>;
}

const CandidatesContext = createContext<CandidatesContextType | undefined>(undefined);

export function CandidatesProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingInbox, setSyncingInbox] = useState<boolean>(false);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

  // Instant hydration from localStorage cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cached_candidates_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCandidates(parsed);
          setLoading(false);
          setHasLoadedOnce(true);
        }
      }
    } catch (e) {
      console.error('Error reading candidates cache:', e);
    }
  }, []);

  const fetchCandidates = useCallback(async (force = false) => {
    if (!hasLoadedOnce && !force && candidates.length === 0) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.success && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setHasLoadedOnce(true);
        // Persist to localStorage for sub-millisecond instant loads on subsequent visits
        try {
          localStorage.setItem('cached_candidates_data', JSON.stringify(data.candidates));
        } catch (e) {
          console.warn('Could not save candidates to localStorage:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [hasLoadedOnce, candidates.length]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const updateCandidateInContext = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidates((prev) => {
      const updatedList = prev.map((cand) => (cand.id === id || cand.email.toLowerCase() === updates.email?.toLowerCase() ? { ...cand, ...updates } : cand));
      try {
        localStorage.setItem('cached_candidates_data', JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });
  }, []);

  const addCandidateInContext = useCallback((newCand: Candidate) => {
    setCandidates((prev) => {
      const updatedList = [newCand, ...prev.filter((c) => c.id !== newCand.id && c.email !== newCand.email)];
      try {
        localStorage.setItem('cached_candidates_data', JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });
  }, []);

  const handleSyncInbox = useCallback(async () => {
    setSyncingInbox(true);
    try {
      const res = await fetch('/api/sync-inbox', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('⚡ Titan Inbox POP3 sync completed! Incoming candidate emails imported.');
        await fetchCandidates(true);
      } else {
        alert(`Inbox sync message: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error syncing inbox:', err);
      alert('Failed to run Titan Inbox sync.');
    } finally {
      setSyncingInbox(false);
    }
  }, [fetchCandidates]);

  const handleBatchAnalyze = useCallback(async () => {
    setBatchProcessing(true);
    try {
      const unanalyzed = candidates.filter((c) => Boolean(c.emailReply) && !c.aiAnalysis);
      for (const cand of unanalyzed) {
        await fetch('/api/analyze-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: cand.id, emailText: cand.emailReply })
        });
      }
      await fetchCandidates(true);
    } catch (err) {
      console.error('Batch analysis error:', err);
    } finally {
      setBatchProcessing(false);
    }
  }, [candidates, fetchCandidates]);

  return (
    <CandidatesContext.Provider
      value={{
        candidates,
        loading: loading && !hasLoadedOnce,
        syncingInbox,
        batchProcessing,
        refreshCandidates: fetchCandidates,
        updateCandidateInContext,
        addCandidateInContext,
        handleSyncInbox,
        handleBatchAnalyze
      }}
    >
      {children}
    </CandidatesContext.Provider>
  );
}

export function useCandidates() {
  const context = useContext(CandidatesContext);
  if (!context) {
    throw new Error('useCandidates must be used within a CandidatesProvider');
  }
  return context;
}
