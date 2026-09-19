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

  const fetchCandidates = useCallback(async (force = false) => {
    // Only set loading to true if we haven't loaded candidates once yet
    if (!hasLoadedOnce && !force) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.success && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setHasLoadedOnce(true);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [hasLoadedOnce]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const updateCandidateInContext = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidates((prev) =>
      prev.map((cand) => (cand.id === id || cand.email.toLowerCase() === updates.email?.toLowerCase() ? { ...cand, ...updates } : cand))
    );
  }, []);

  const addCandidateInContext = useCallback((newCand: Candidate) => {
    setCandidates((prev) => [newCand, ...prev.filter((c) => c.id !== newCand.id && c.email !== newCand.email)]);
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
