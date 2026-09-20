'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  Search,
  LogOut,
  GraduationCap,
  Mail,
  ChevronLeft,
  ChevronRight,
  Download,
  Send,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users
} from 'lucide-react';
import { Candidate } from '@/lib/types';
import { useCandidates } from '@/context/CandidatesContext';

export default function PendingCandidatesPage() {
  const router = useRouter();
  const { candidates, loading, updateCandidateInContext, refreshCandidates } = useCandidates();
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reminder Sending State
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSendReminder = async (cand: Candidate) => {
    setSendingMap((prev) => ({ ...prev, [cand.id]: true }));
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: cand.id,
          email: cand.email,
          name: cand.name,
          domain: cand.domain
        })
      });

      const data = await res.json();
      if (data.success) {
        const today = new Date().toISOString().split('T')[0];
        updateCandidateInContext(cand.id, { reminderSentDate: today });
      } else {
        alert(`Failed to send reminder: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert('Failed to send reminder email due to network error.');
    } finally {
      setSendingMap((prev) => ({ ...prev, [cand.id]: false }));
    }
  };

  // Filter candidates to ONLY show those awaiting responses (no email reply text)
  const candList = Array.isArray(candidates) ? candidates : [];
  const pendingCandidates = candList.filter((c) => !c.emailReply || !c.emailReply.trim());

  const domains = Array.from(new Set(pendingCandidates.map((c) => c.domain)));

  const filteredCandidates = pendingCandidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDomain = domainFilter === 'ALL' || c.domain === domainFilter;

    return matchesSearch && matchesDomain;
  });

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, domainFilter]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCandidates.length);
  const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + itemsPerPage);

  // CSV Export for Pending Candidates
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Domain', 'University', 'Offer Sent Date', 'Status'];
    const rows = filteredCandidates.map((c) => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.domain}"`,
      `"${c.university}"`,
      `"${c.offerSentDate}"`,
      `"Awaiting Response"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Awaiting_Responses_Candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans pb-16 relative">
      {/* Background Glow Overlay - translucent to show dashboard.png background image */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/15 via-slate-950/80 to-slate-950/95" />

      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Awaiting Responses
                <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 uppercase">
                  {pendingCandidates.length} Pending
                </span>
              </h1>
              <p className="text-xs text-slate-400">Candidates who haven't replied to offer letters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Export CSV
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 border border-slate-800 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 relative z-10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-slate-400" /> Dashboard Overview
          </Link>

          <Link
            href="/dashboard/pending"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-amber-400" /> Awaiting Responses ({pendingCandidates.length})
          </Link>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/50 backdrop-blur-md border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Awaiting Responses</p>
                <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{pendingCandidates.length}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-amber-400" /> Offers sent, zero reply body recorded
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Offers Sent</p>
                <h3 className="text-3xl font-extrabold text-white mt-1">{candList.length}</h3>
              </div>
              <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl text-slate-300">
                <FileText className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 font-mono">
              Pending Rate: {candList.length > 0 ? Math.round((pendingCandidates.length / candList.length) * 100) : 0}%
            </p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Unique Domains</p>
                <h3 className="text-3xl font-extrabold text-indigo-400 mt-1">{domains.length}</h3>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Ready for automated follow-up</p>
          </div>
        </div>

        {/* Search & Domain Filter Bar */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, email, university..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Domains ({domains.length})</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={() => refreshCandidates(true)}
              title="Refresh Pending List"
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
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Loading Awaiting Candidate Records...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No pending candidates found matching search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-4 px-5">#</th>
                    <th className="py-4 px-5">Candidate Name</th>
                    <th className="py-4 px-5">Domain & University</th>
                    <th className="py-4 px-5">Offer Sent Date</th>
                    <th className="py-4 px-5 text-center">Reminders Sent</th>
                    <th className="py-4 px-5">Reply Status</th>
                    <th className="py-4 px-5 text-right">Actions / Send Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedCandidates.map((cand, idx) => {
                    const count = cand.reminderCount !== undefined 
                      ? cand.reminderCount 
                      : (cand.reminderSentDate ? 1 : 0);

                    return (
                      <tr key={cand.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-5 text-slate-500 font-mono text-[11px]">
                          {startIndex + idx + 1}
                        </td>

                        {/* Name & Email */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-white text-sm">{cand.name}</div>
                          <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-slate-500" />
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

                        {/* Date */}
                        <td className="py-4 px-5 text-slate-300 font-mono">
                          {cand.offerSentDate || '2026-09-15'}
                        </td>

                        {/* Reminders Sent Count Column */}
                        <td className="py-4 px-5 text-center">
                          {count > 0 ? (
                            <span className="inline-flex flex-col items-center justify-center px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                              <span>{count} {count === 1 ? 'Reminder' : 'Reminders'}</span>
                              {cand.reminderSentDate && (
                                <span className="text-[10px] text-slate-400 font-mono font-normal">
                                  {cand.reminderSentDate}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/60 border border-slate-700/60 text-slate-400">
                              0 Sent
                            </span>
                          )}
                        </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-3.5 h-3.5" /> Awaiting Candidate Reply
                        </span>
                      </td>

                      {/* Action / Send Reminder Button */}
                      <td className="py-4 px-5 text-right">
                        {cand.reminderSentDate ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reminder Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendReminder(cand)}
                            disabled={sendingMap[cand.id]}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 px-3 py-1.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {sendingMap[cand.id] ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" /> Send Reminder
                              </>
                            )}
                          </button>
                        )}
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
                <span className="font-bold text-slate-200">{filteredCandidates.length}</span> pending candidates
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
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>per page</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-amber-400">
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
    </div>
  );
}
