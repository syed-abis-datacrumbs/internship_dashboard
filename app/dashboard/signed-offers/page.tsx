'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  LogOut,
  GraduationCap,
  Mail,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  Check,
  Copy,
  Users,
  FileText,
  Zap,
  Edit3,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { Candidate } from '@/lib/types';
import { useCandidates } from '@/context/CandidatesContext';

export default function SignedOffersPage() {
  const router = useRouter();
  const { candidates, loading, refreshCandidates, updateCandidateInContext } = useCandidates();

  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sending state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email template modal & editing
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState(
    'Welcome to the Team! Join our Official WhatsApp Group 🚀'
  );
  const [customMessage, setCustomMessage] = useState(
    `Hi [Candidate Name],

Congratulations once again on accepting your offer! We are thrilled to officialize your joining and can't wait to have you onboard.

To help you connect with your fellow cohort members, receive real-time updates regarding orientation, and easily reach out to our team, we have set up an official WhatsApp group.

👉 Join the WhatsApp Group here:
https://chat.whatsapp.com/EETyPU6dheJLTDdTRKvOQA

Next Steps upon joining:
1. Introduce yourself with your Name and Domain.
2. Keep an eye out for upcoming onboarding announcements and schedule details.

If you face any issues joining the group or have any questions, feel free to reply directly to this email.

Welcome aboard, and we look forward to working with you!

Best regards,
DataCrumbs HR Team`
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter signed / accepted candidates
  const signedCandidates = candidates.filter((c) => c.status === 'ACCEPTED');

  const domains = Array.from(new Set(signedCandidates.map((c) => c.domain)));

  const filteredCandidates = signedCandidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDomain = domainFilter === 'ALL' || c.domain === domainFilter;

    return matchesSearch && matchesDomain;
  });

  // Handle Select All / Deselect All
  const handleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Send WhatsApp invite emails
  const handleSendInvites = async (idsToSend: string[]) => {
    if (idsToSend.length === 0) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/send-whatsapp-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: idsToSend,
          subject: emailSubject,
          customMessage
        })
      });

      const data = await res.json();

      if (data.success) {
        setSendResult({
          success: true,
          message: data.message || `Successfully sent to ${idsToSend.length} candidate(s)!`
        });

        // Update candidates in context
        const nowIso = new Date().toISOString();
        idsToSend.forEach((id) => {
          const target = candidates.find((c) => c.id === id);
          if (target) {
            updateCandidateInContext(id, {
              ...target,
              whatsappSent: true,
              whatsappSentDate: nowIso
            });
          }
        });

        // Deselect sent candidates
        setSelectedIds((prev) => prev.filter((id) => !idsToSend.includes(id)));
        refreshCandidates(true);
      } else {
        setSendResult({
          success: false,
          message: data.message || 'Failed to send WhatsApp onboarding emails.'
        });
      }
    } catch (err: any) {
      console.error('Error sending WhatsApp invites:', err);
    } finally {
      setSending(false);
    }
  };

  // Stats
  const totalSigned = signedCandidates.length;
  const whatsappSentCount = signedCandidates.filter((c) => c.whatsappSent).length;
  const whatsappPendingCount = totalSigned - whatsappSentCount;

  // Pagination calculations
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Signed Offers & WhatsApp Onboarding
                <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 uppercase">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> CC: people@datacrumbs.org
                </span>
              </h1>
              <p className="text-xs text-slate-400">DataCrumbs Internship Program</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3.5 py-2 rounded-xl transition-all"
            >
              <Edit3 className="w-4 h-4 text-emerald-400" /> Customize Email Template
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-400" /> Dashboard Overview ({candidates.length})
          </Link>

          <Link
            href="/dashboard/pending"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent transition-all flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-amber-400" /> Awaiting Responses
          </Link>

          <Link
            href="/dashboard/signed-offers"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Signed Offers & WhatsApp ({totalSigned})
          </Link>
        </div>

        {/* Status Toast Alert */}
        {sendResult && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
              sendResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{sendResult.message}</span>
            </div>
            <button
              onClick={() => setSendResult(null)}
              className="text-slate-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-emerald-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Total Signed Candidates
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{totalSigned}</span>
              <span className="text-xs text-emerald-400 font-semibold">confirmed</span>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-green-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-green-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                WhatsApp Link Sent
              </span>
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-green-400">{whatsappSentCount}</span>
              <span className="text-xs text-slate-400">candidates</span>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-xl bg-gradient-to-b from-amber-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Pending WhatsApp Invite
              </span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-400">{whatsappPendingCount}</span>
              <span className="text-xs text-amber-300 font-medium">needs email</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Bulk Action Button */}
            <button
              onClick={() => handleSendInvites(selectedIds)}
              disabled={sending || selectedIds.length === 0}
              className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Invites...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send WhatsApp Link ({selectedIds.length} Selected)
                </>
              )}
            </button>

            <span className="text-xs text-slate-400 hidden sm:inline">
              CC: <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono">people@datacrumbs.org</code>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search signed candidates..."
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
              onClick={() => refreshCandidates(true)}
              title="Refresh Candidates"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Loading Signed Candidate Records...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No signed candidates found matching search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-4 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.length > 0 &&
                          selectedIds.length === filteredCandidates.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-5">Candidate Name & Email</th>
                    <th className="py-4 px-5">Domain & University</th>
                    <th className="py-4 px-5">Signed / Response Date</th>
                    <th className="py-4 px-5">WhatsApp Link Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedCandidates.map((cand) => {
                    const isSelected = selectedIds.includes(cand.id);
                    return (
                      <tr
                        key={cand.id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          isSelected ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(cand.id)}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {cand.name}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Signed Offer
                            </span>
                          </div>
                          <div className="text-slate-400 text-xs font-mono mt-0.5">
                            {cand.email}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-200">{cand.domain}</div>
                          <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                            {cand.university}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-slate-300 font-medium">
                          {cand.responseDate || cand.offerSentDate || 'N/A'}
                        </td>

                        <td className="py-4 px-5">
                          {cand.whatsappSent ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                              Invite Sent
                              {cand.whatsappSentDate && (
                                <span className="text-[10px] opacity-75 font-mono ml-1">
                                  ({new Date(cand.whatsappSentDate).toLocaleDateString()})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Pending Invite
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => handleSendInvites([cand.id])}
                            disabled={sending}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                              cand.whatsappSent
                                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 shadow-md shadow-emerald-900/30'
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {cand.whatsappSent ? 'Resend WhatsApp Link' : 'Send WhatsApp Link'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
                <span className="font-bold text-slate-200">{filteredCandidates.length}</span> signed candidates
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Email Customization Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Customize WhatsApp Onboarding Email Template
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    CC recipient automatically set to <code className="text-emerald-400 font-mono">people@datacrumbs.org</code>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email Body Template (Placeholders: <code className="text-emerald-400">[Candidate Name]</code>)
                </label>
                <textarea
                  rows={14}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  WhatsApp Group Link:{' '}
                  <a
                    href="https://chat.whatsapp.com/EETyPU6dheJLTDdTRKvOQA"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold"
                  >
                    https://chat.whatsapp.com/EETyPU6dheJLTDdTRKvOQA
                  </a>
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
