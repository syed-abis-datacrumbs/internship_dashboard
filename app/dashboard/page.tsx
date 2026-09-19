'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  LogOut,
  Bot,
  Brain,
  MessageSquare,
  Plus,
  RefreshCw,
  FileText,
  GraduationCap,
  Mail,
  ChevronLeft,
  ChevronRight,
  Zap,
  Copy,
  Send,
  Check,
  Wand2
} from 'lucide-react';
import { Candidate, OfferStatus } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // UI Control States
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [emailText, setEmailText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [syncingInbox, setSyncingInbox] = useState(false);

  // AI Draft Response States
  const [draftText, setDraftText] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [draftTone, setDraftTone] = useState<'auto' | 'welcome' | 'answer' | 'decline'>('auto');

  // Add Candidate Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    domain: 'AI & Data Science',
    university: '',
    score: 90
  });

  // Batch Analyze Existing Replies
  const handleBatchAnalyze = async () => {
    setBatchProcessing(true);
    try {
      const unanalyzed = candidates.filter(
        (c) => c.emailReply && c.emailReply.trim() && !c.aiAnalysis
      );
      for (const cand of unanalyzed) {
        await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: cand.id, emailText: cand.emailReply })
        });
      }
      fetchCandidates();
    } catch (err) {
      console.error('Batch analysis error', err);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleSyncInbox = async () => {
    setSyncingInbox(true);
    try {
      const res = await fetch('/api/sync-inbox', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('⚡ Titan Inbox POP3 sync completed! Incoming candidate emails imported.');
        fetchCandidates();
      } else {
        alert(`Inbox sync message: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error syncing inbox:', err);
      alert('Failed to run Titan Inbox sync.');
    } finally {
      setSyncingInbox(false);
    }
  };

  // Fetch candidates from API
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Trigger AI Draft response generation
  const handleGenerateDraft = async (cand: Candidate, tonePreset = 'auto') => {
    setGeneratingDraft(true);
    setDraftTone(tonePreset as any);
    try {
      const res = await fetch('/api/draft-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: cand.name,
          candidateEmail: cand.email,
          domain: cand.domain,
          emailContent: cand.emailReply || emailText,
          intent: cand.aiAnalysis?.intent || 'UNCERTAIN',
          summary: cand.aiAnalysis?.summary || '',
          tonePreset
        })
      });
      const data = await res.json();
      if (data.success && data.draftResponse) {
        setDraftText(data.draftResponse.replace(/\*\*/g, ''));
      }
    } catch (err) {
      console.error('Error generating AI draft:', err);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedCandidate || !draftText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: selectedCandidate.email,
          candidateName: selectedCandidate.name,
          candidateId: selectedCandidate.id,
          subject: `Re: DataCrumbs ChangeMaker Internship Program - ${selectedCandidate.name}`,
          replyText: draftText
        })
      });
      const data = await res.json();
      if (data.success) {
        const sentDate = data.replySentDate || new Date().toISOString();
        const updatedCandidate: Candidate = {
          ...selectedCandidate,
          replySent: true,
          replySentDate: sentDate,
          lastSentDraft: draftText
        };
        setSelectedCandidate(updatedCandidate);
        setCandidates((prev) => prev.map((c) => (c.id === updatedCandidate.id ? updatedCandidate : c)));
        alert(`✅ Reply email sent to ${selectedCandidate.email} (CC: people@datacrumbs.org)!`);
      } else {
        alert(`Failed to send email: ${data.message}`);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Error sending email reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  // Open Gemini Reply Analyzer for a candidate
  const openAnalyzer = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setEmailText(cand.emailReply || '');
    setAnalysisError('');
    setDraftText('');
    handleGenerateDraft(cand, 'auto');
  };

  // Run Gemini LLM analysis
  const runGeminiAnalysis = async () => {
    if (!selectedCandidate || !emailText.trim()) {
      setAnalysisError('Please provide email reply text to analyze.');
      return;
    }

    setAnalyzing(true);
    setAnalysisError('');

    try {
      const res = await fetch('/api/analyze-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          emailReply: emailText
        })
      });

      const data = await res.json();

      if (data.success && data.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === data.candidate.id ? data.candidate : c))
        );
        setSelectedCandidate(data.candidate);
      } else {
        setAnalysisError(data.message || 'Analysis failed');
      }
    } catch (err) {
      setAnalysisError('Network error during AI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // Manual status update
  const handleStatusChange = async (candidateId: string, newStatus: OfferStatus) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidateId, status: newStatus })
      });

      const data = await res.json();
      if (data.success && data.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? data.candidate : c))
        );
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate(data.candidate);
        }
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Add new candidate offer
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCandidate,
          status: 'OFFER_SENT',
          offerSentDate: new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (data.success && data.candidate) {
        setCandidates((prev) => [data.candidate, ...prev]);
        setShowAddModal(false);
        setNewCandidate({
          name: '',
          email: '',
          domain: 'AI & Data Science',
          university: '',
          score: 90
        });
      }
    } catch (err) {
      console.error('Failed to add candidate', err);
    }
  };

  // Calculated Stats
  const totalOffers = candidates.length;
  const emailsReceived = candidates.filter((c) => Boolean(c.emailReply && c.emailReply.trim())).length;
  const acceptedOffers = candidates.filter((c) => c.status === 'ACCEPTED').length;
  const declinedOffers = candidates.filter((c) => c.status === 'DECLINED').length;
  const reviewOffers = candidates.filter((c) => c.status === 'NEEDS_REVIEW').length;
  const pendingReviewOffers = candidates.filter((c) => c.status === 'NEEDS_REVIEW' && !c.replySent).length;
  const repliedReviewOffers = candidates.filter((c) => c.status === 'NEEDS_REVIEW' && c.replySent).length;
  const pendingOffers = candidates.filter((c) => !c.emailReply || !c.emailReply.trim()).length;
  const acceptanceRate = emailsReceived > 0 ? Math.round((acceptedOffers / emailsReceived) * 100) : 0;

  // Filtered List
  const domains = Array.from(new Set(candidates.map((c) => c.domain)));

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'UNREPLIED') {
      matchesStatus = Boolean(c.emailReply && c.emailReply.trim() && !c.replySent);
    } else if (statusFilter !== 'ALL') {
      matchesStatus = c.status === statusFilter;
    }

    const matchesDomain = domainFilter === 'ALL' || c.domain === domainFilter;

    return matchesSearch && matchesStatus && matchesDomain;
  });

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, domainFilter]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCandidates.length);
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen text-slate-100 font-sans pb-16 relative">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Offer Acceptance Dashboard
                <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 uppercase">
                  <Bot className="w-3 h-3 text-emerald-400" /> OpenAI LLM Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">DataCrumbs Internship Program</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncInbox}
              disabled={syncingInbox}
              className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-900/30 border border-amber-500/30 disabled:opacity-50"
              title="Execute POP3 sync script (sync_titan_inbox_pop3.py) to fetch emails from Titan Mail"
            >
              {syncingInbox ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Syncing Inbox...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-200" /> Sync Titan Inbox (POP3)
                </>
              )}
            </button>

            <button
              onClick={handleBatchAnalyze}
              disabled={batchProcessing}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-900/30 border border-emerald-500/30 disabled:opacity-50"
            >
              {batchProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Batch Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" /> Batch Analyze Existing Replies
                </>
              )}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl transition-all border border-slate-700/80"
            >
              <Plus className="w-4 h-4" /> Add Offer Record
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-2 rounded-xl transition-all border border-slate-700/80"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8 relative z-10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-400" /> Dashboard Overview ({candidates.length})
          </Link>

          <Link
            href="/dashboard/pending"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent transition-all flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-amber-400" /> Awaiting Responses ({pendingOffers})
          </Link>
        </div>

        {/* KPI Cards Row (Glassmorphic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Offers Sent Card */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Offers Sent</span>
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalOffers}</span>
              <span className="text-xs text-slate-400">issued</span>
            </div>
            <div className="mt-3 w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* 2. Accepted Offers Card */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-emerald-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Accepted Offers</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400">{acceptedOffers}</span>
              <span className="text-xs text-emerald-400 font-bold">({acceptanceRate}%)</span>
            </div>
            <div className="mt-3 w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${acceptanceRate}%` }} />
            </div>
          </div>

          {/* 3. Emails Received Card */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-sky-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-sky-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Emails Received</span>
              <Mail className="w-5 h-5 text-sky-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-sky-400">{emailsReceived}</span>
              <span className="text-xs text-sky-400/80 font-semibold">replies</span>
            </div>
            <div className="mt-3 w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-sky-500 h-full rounded-full"
                style={{ width: `${totalOffers ? (emailsReceived / totalOffers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 4. Awaiting Responses Card */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Responses</span>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-200">{pendingOffers}</span>
              <span className="text-xs text-slate-400">pending</span>
            </div>
            <div className="mt-3 w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-slate-500 h-full rounded-full"
                style={{ width: `${totalOffers ? (pendingOffers / totalOffers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 5. Questions / Review Card */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-amber-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Questions / Review</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">{pendingReviewOffers}</span>
              <span className="text-xs text-amber-400/80 font-semibold">needs action</span>
            </div>
            <div className="mt-3 w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalOffers ? (pendingReviewOffers / totalOffers) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{repliedReviewOffers} replied</span>
              <span>{reviewOffers} total questions</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Candidates' },
              { id: 'UNREPLIED', label: `Pending Reply (${pendingReviewOffers})` },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'DECLINED', label: 'Declined' },
              { id: 'NEEDS_REVIEW', label: `Review Required (${reviewOffers})` },
              { id: 'OFFER_SENT', label: 'Offer Sent' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Domain Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={fetchCandidates}
              title="Refresh Data"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidate List Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Loading Candidate Offer Records...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No candidates found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-4 px-5">Candidate Name</th>
                    <th className="py-4 px-5">Domain & University</th>
                    <th className="py-4 px-5">Offer Status</th>
                    <th className="py-4 px-5">Dates</th>
                    <th className="py-4 px-5">Gemini AI Reply Analysis</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedCandidates.map((cand) => (
                    <tr
                      key={cand.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{cand.name}</span>
                          {cand.replySent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" /> Replied
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 font-mono">
                          {cand.email}
                        </div>
                      </td>

                      {/* Domain & University */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-200">{cand.domain}</div>
                        <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                          {cand.university}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <select
                            value={cand.status}
                            onChange={(e) =>
                              handleStatusChange(cand.id, e.target.value as OfferStatus)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-bold border focus:outline-none transition-all cursor-pointer ${
                              cand.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : cand.status === 'DECLINED'
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : cand.status === 'NEEDS_REVIEW'
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <option value="ACCEPTED" className="bg-slate-950 text-emerald-400">
                              ✓ Accepted
                            </option>
                            <option value="DECLINED" className="bg-slate-950 text-rose-400">
                              ✗ Declined
                            </option>
                            <option value="NEEDS_REVIEW" className="bg-slate-950 text-amber-400">
                              ⚠ Needs Review
                            </option>
                            <option value="OFFER_SENT" className="bg-slate-950 text-slate-300">
                              ✉ Offer Sent
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-5 text-slate-400">
                        <div>Sent: <span className="text-slate-200 font-medium">{cand.offerSentDate}</span></div>
                        {cand.responseDate && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Replied: {cand.responseDate}
                          </div>
                        )}
                      </td>

                      {/* AI Analysis Preview */}
                      <td className="py-4 px-5 max-w-xs">
                        {cand.aiAnalysis ? (
                          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-emerald-400 flex items-center gap-1">
                                <Brain className="w-3.5 h-3.5 text-emerald-400" />
                                {cand.aiAnalysis.intent}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {Math.round(cand.aiAnalysis.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] line-clamp-2">
                              {cand.aiAnalysis.summary}
                            </p>
                          </div>
                        ) : cand.emailReply ? (
                          <span className="text-amber-400 text-xs flex items-center gap-1 font-medium">
                            <MessageSquare className="w-3.5 h-3.5" /> Reply Received (Unanalyzed)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs italic">Awaiting candidate reply</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        {cand.replySent ? (
                          <button
                            onClick={() => openAnalyzer(cand)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                            title="Email reply sent. Click to view draft & analysis."
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            View Sent Reply
                          </button>
                        ) : cand.emailReply ? (
                          <button
                            onClick={() => openAnalyzer(cand)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 px-3.5 py-1.5 rounded-xl transition-all shadow-lg shadow-amber-500/20"
                            title="Candidate asked a question or sent a reply. Action needed!"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                            Reply Now
                          </button>
                        ) : (
                          <button
                            onClick={() => openAnalyzer(cand)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 px-3.5 py-1.5 rounded-xl transition-all"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && filteredCandidates.length > 0 && (
            <div className="bg-slate-950/90 border-t border-slate-800/80 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Showing <span className="font-bold text-slate-200">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-slate-200">{endIndex}</span> of{' '}
                <span className="font-bold text-slate-200">{filteredCandidates.length}</span> candidates
              </div>

              <div className="flex items-center gap-4">
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>per page</span>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Gemini Email Reply Analyzer Modal with AI Response Composer */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0b0f19] shadow-sm shadow-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Candidate Email Reply & AI Response Draft
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Assistant
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    Candidate: <span className="text-emerald-400 font-bold">{selectedCandidate.name}</span>
                    <span className="text-slate-400">({selectedCandidate.email})</span>
                    <span className="text-slate-600">•</span>
                    <span className="bg-slate-800/80 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-md border border-slate-700/60 font-medium">
                      Role: {selectedCandidate.domain}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all"
                  title="History"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all text-sm"
                  title="Close Modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Dual Pane Layout */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto flex-1 pr-1">
              {/* LEFT COLUMN: Candidate Email & AI Classification */}
              <div className="space-y-4 flex flex-col justify-between">
                {/* Candidate Email Reply Box */}
                <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-[11px] font-bold text-slate-300 tracking-wider flex items-center gap-2 uppercase">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      Candidate Email Reply Content
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" /> Today at 10:24 AM
                    </span>
                  </div>
                  <textarea
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    rows={9}
                    placeholder="Candidate email reply text..."
                    className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 font-sans min-h-[220px]"
                  />
                </div>

                {/* AI Classification Card */}
                {selectedCandidate.aiAnalysis && (
                  <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                      <span className="text-[11px] font-bold text-emerald-400 tracking-wider flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI CLASSIFICATION
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                          selectedCandidate.aiAnalysis.intent === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                            : selectedCandidate.aiAnalysis.intent === 'DECLINED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Intent: {selectedCandidate.aiAnalysis.intent} / INQUIRY
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        <span>Executive Summary</span>
                        <span className="text-slate-500 font-mono">AUTO-GENERATED</span>
                      </div>
                      <p className="text-xs font-medium text-slate-100 leading-relaxed">
                        {selectedCandidate.aiAnalysis.summary}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80">
                      <span>
                        Recommended Status:{' '}
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded text-[11px] font-bold ml-1.5">
                          {selectedCandidate.aiAnalysis.recommendedStatus}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        Confidence:{' '}
                        <strong className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          {Math.round(selectedCandidate.aiAnalysis.confidence * 100)}%
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: AI Response Draft Composer */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex flex-col flex-1 min-h-0 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI RESPONSE DRAFT
                    </label>
                    <div className="flex items-center gap-2">
                      {selectedCandidate.replySent && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Email Sent ({selectedCandidate.replySentDate ? new Date(selectedCandidate.replySentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sent'})
                        </span>
                      )}
                      <button
                        onClick={() => handleGenerateDraft(selectedCandidate, draftTone)}
                        disabled={generatingDraft}
                        className="text-[11px] text-emerald-400 hover:text-white font-semibold flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${generatingDraft ? 'animate-spin' : ''}`} />
                        Re-generate Draft
                      </button>
                    </div>
                  </div>

                  {/* Editor Container */}
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex-1 flex flex-col justify-between space-y-2 focus-within:border-emerald-500/50 transition-all min-h-0">
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      placeholder={generatingDraft ? "OpenAI is drafting response..." : "AI generated response draft..."}
                      className="w-full flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-sans leading-relaxed min-h-[220px] resize-none"
                    />

                    {/* Editor Footer Status Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono shrink-0">
                      <span className="flex items-center gap-1.5 text-slate-400 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Auto-saved draft
                      </span>
                      <span>
                        Characters: <strong className="text-slate-200 font-bold">{draftText.length}</strong> • Tokens:{' '}
                        <strong className="text-slate-200 font-bold">{Math.ceil(draftText.length / 4)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-3 shrink-0">
                  <button
                    onClick={handleCopyDraft}
                    disabled={!draftText.trim()}
                    className="flex-1 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold py-3 px-4 rounded-2xl border border-slate-800 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {copiedToast ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" /> Copy Draft Text
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !draftText.trim()}
                    className={`flex-1 font-bold text-xs py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 disabled:opacity-50 transition-all ${
                      selectedCandidate.replySent
                        ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400/80 shadow-lg shadow-emerald-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-xl shadow-emerald-500/20'
                    }`}
                  >
                    {sendingReply ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Sending Email...
                      </>
                    ) : selectedCandidate.replySent ? (
                      <>
                        <Check className="w-4 h-4 text-white" /> Email Already Sent (Resend?)
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-slate-950" /> Send Email
                        <span className="bg-slate-950/20 text-slate-950 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-950/20 ml-1">
                          ⌘↵
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Offer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> Add New Offer Letter
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg p-2 rounded-xl bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCandidate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={newCandidate.name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                  placeholder="e.g. Ali Ahmed"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  placeholder="ali.ahmed@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Domain Role</label>
                <select
                  value={newCandidate.domain}
                  onChange={(e) => setNewCandidate({ ...newCandidate, domain: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-100"
                >
                  <option value="AI & Data Science">AI & Data Science</option>
                  <option value="Full Stack Web Development">Full Stack Web Development</option>
                  <option value="Mobile App Development">Mobile App Development</option>
                  <option value="Cyber Security">Cyber Security</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">University</label>
                <input
                  type="text"
                  required
                  value={newCandidate.university}
                  onChange={(e) => setNewCandidate({ ...newCandidate, university: e.target.value })}
                  placeholder="e.g. NUST / FAST / COMSATS"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-600"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all border border-emerald-500/30 mt-2"
              >
                Save & Issue Offer Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
