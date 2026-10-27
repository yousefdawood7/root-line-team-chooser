'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  Search,
  Filter,
  Users,
  Briefcase,
  Building,
  CheckCircle2,
  Lock,
  Sparkles,
  Eye,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { MyTeamDrawer } from '@/components/MyTeamDrawer';
import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';

export default function DraftPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'mine' | 'others'>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Modal & Drawer states
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch session & draft state
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      // 1. Get current session
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setCurrentUser(meData.user);
      setCurrentLead(meData.lead);

      // 2. Get draft state
      const stateRes = await fetch('/api/draft/state');
      if (stateRes.ok) {
        const stateData: DraftState = await stateRes.json();
        setDraftState(stateData);

        // Update local currentLead from latest state if available
        if (meData.user?.role === 'lead') {
          const freshLead = stateData.leads.find(
            (l) => l.id === meData.user.leadId || l.email.toLowerCase() === meData.user.email.toLowerCase()
          );
          if (freshLead) setCurrentLead(freshLead);
        }
      }
    } catch (err) {
      console.error('Failed to fetch draft data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();

    // Auto-refresh poll every 4 seconds for live sync among leads
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Pick
  const handlePickCandidate = async (candidateId: string) => {
    const res = await fetch('/api/draft/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to claim candidate');
    }

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    // Refresh state
    await fetchData(true);

    // Update preview candidate if modal is open
    if (previewCandidate && previewCandidate.id === candidateId && data.candidate) {
      setPreviewCandidate(data.candidate);
    }
  };

  // Handle Release
  const handleReleaseCandidate = async (candidateId: string) => {
    const res = await fetch('/api/draft/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to release candidate');
    }

    await fetchData(true);

    if (previewCandidate && previewCandidate.id === candidateId) {
      setPreviewCandidate({
        ...previewCandidate,
        assignedToLeadId: null,
        assignedToLeadName: null,
        assignedToLeadEmail: null,
        assignedAt: null,
      });
    }
  };

  // Open Candidate Preview
  const openPreview = (candidate: Candidate) => {
    setPreviewCandidate(candidate);
    setIsModalOpen(true);
  };

  // Extract all departments for filter
  const departments = useMemo(() => {
    if (!draftState?.candidates) return [];
    const depts = new Set<string>();
    draftState.candidates.forEach((c) => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts);
  }, [draftState?.candidates]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    if (!draftState?.candidates) return [];

    return draftState.candidates.filter((candidate) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = candidate.name.toLowerCase().includes(q);
        const matchesRole = candidate.role?.toLowerCase().includes(q);
        const matchesDept = candidate.department?.toLowerCase().includes(q);
        const matchesSkills = candidate.skills?.some((s) => s.toLowerCase().includes(q));
        const matchesNotes = candidate.notes?.toLowerCase().includes(q);

        if (!matchesName && !matchesRole && !matchesDept && !matchesSkills && !matchesNotes) {
          return false;
        }
      }

      // 2. Department filter
      if (selectedDept !== 'all' && candidate.department !== selectedDept) {
        return false;
      }

      // 3. Status filter
      if (statusFilter === 'available') {
        return !candidate.assignedToLeadId;
      }
      if (statusFilter === 'mine') {
        return currentLead && candidate.assignedToLeadId === currentLead.id;
      }
      if (statusFilter === 'others') {
        return (
          candidate.assignedToLeadId &&
          (!currentLead || candidate.assignedToLeadId !== currentLead.id)
        );
      }

      return true;
    });
  }, [draftState?.candidates, searchQuery, selectedDept, statusFilter, currentLead]);

  // Statistics
  const stats = useMemo(() => {
    if (!draftState) return { total: 0, available: 0, claimed: 0, myPicks: 0 };
    const total = draftState.candidates.length;
    const claimed = draftState.candidates.filter((c) => c.assignedToLeadId).length;
    const available = total - claimed;
    const myPicks = currentLead
      ? draftState.candidates.filter((c) => c.assignedToLeadId === currentLead.id).length
      : 0;
    return { total, available, claimed, myPicks };
  }, [draftState, currentLead]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading draft board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar
        user={currentUser}
        lead={currentLead}
        isLocked={draftState?.settings.isLocked}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Draft Locked Notice */}
        {draftState?.settings.isLocked && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center gap-3 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Draft is temporarily paused.</span> Selections are locked while the administrator makes updates.
            </div>
          </div>
        )}

        {/* Hero Section & Lead Tracker */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {draftState?.settings.title || 'Root Line Team Draft'}
                </span>
                {refreshing && (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                Candidate Draft Board
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {currentLead
                  ? `Welcome, ${currentLead.name}! Select candidates to build your team.`
                  : 'Browse candidates and monitor the live team selections.'}
              </p>
            </div>

            {/* Quick Action & Team Summary Button */}
            <div className="flex items-center gap-3">
              {currentLead && (
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2.5 transition"
                >
                  <Users className="w-4 h-4" />
                  <span>My Squad ({stats.myPicks} / {currentLead.quota})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quota Progress Bar for current lead */}
          {currentLead && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Your Assigned Quota:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {currentLead.quota} candidates total
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  <strong>{Math.max(0, currentLead.quota - stats.myPicks)}</strong> picks remaining
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      currentLead.quota > 0
                        ? Math.min(100, (stats.myPicks / currentLead.quota) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, role, skills, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'available'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Available ({stats.available})
              </button>
              {currentLead && (
                <button
                  onClick={() => setStatusFilter('mine')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    statusFilter === 'mine'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  My Squad ({stats.myPicks})
                </button>
              )}
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Candidate Grid */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No candidates found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {draftState?.candidates.length === 0
                ? 'No candidates have been uploaded yet. Please contact the administrator to upload an Excel or CSV file.'
                : 'No candidates matched your filter or search query. Try clearing your search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCandidates.map((candidate) => {
              const isAssigned = Boolean(candidate.assignedToLeadId);
              const isAssignedToMe = Boolean(
                currentLead && candidate.assignedToLeadId === currentLead.id
              );
              const isAssignedToOther = isAssigned && !isAssignedToMe;
              const isQuotaFull = Boolean(
                currentLead && currentLead.quota > 0 && currentLead.pickedCount >= currentLead.quota
              );

              return (
                <div
                  key={candidate.id}
                  onClick={() => openPreview(candidate)}
                  className={`rounded-2xl p-5 bg-white dark:bg-slate-900 border transition-all cursor-pointer flex flex-col justify-between group relative ${
                    isAssignedToMe
                      ? 'border-emerald-300 dark:border-emerald-700/60 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                      : isAssignedToOther
                      ? 'border-slate-200 dark:border-slate-800 opacity-75'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5'
                  }`}
                >
                  <div>
                    {/* Top Status & Role */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                            {candidate.name}
                          </h3>
                          {candidate.role && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                              {candidate.role}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badges */}
                      {isAssignedToMe ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> My Pick
                        </span>
                      ) : isAssignedToOther ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Lock className="w-3 h-3" /> Taken
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Available
                        </span>
                      )}
                    </div>

                    {/* Department / Experience */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 text-xs text-slate-500 dark:text-slate-400">
                      {candidate.department && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                          <Building className="w-3 h-3" /> {candidate.department}
                        </span>
                      )}
                      {candidate.experience && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                          {candidate.experience}
                        </span>
                      )}
                    </div>

                    {/* Skills pills */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {candidate.skills.slice(0, 3).map((skill, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md text-slate-400">
                            +{candidate.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Details
                    </span>

                    {currentLead && !isAssigned && !isQuotaFull && !draftState?.settings.isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickCandidate(candidate.id);
                        }}
                        className="text-[11px] font-bold px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 transition flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Pick
                      </button>
                    )}

                    {isAssignedToOther && (
                      <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                        Lead: {candidate.assignedToLeadName || 'Other'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Candidate Preview Modal */}
      <CandidatePreviewModal
        candidate={previewCandidate}
        currentUser={currentUser}
        currentLead={currentLead}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPick={handlePickCandidate}
        onRelease={handleReleaseCandidate}
        isDraftLocked={draftState?.settings.isLocked}
      />

      {/* My Team Drawer */}
      <MyTeamDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lead={currentLead}
        candidates={draftState?.candidates || []}
        onSelectCandidate={openPreview}
        onReleaseCandidate={handleReleaseCandidate}
      />
    </div>
  );
}
