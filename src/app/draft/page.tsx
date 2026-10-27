'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Briefcase,
  Building,
  CheckCircle2,
  Lock,
  Eye,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { MyTeamDrawer } from '@/components/MyTeamDrawer';
import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setCurrentUser(meData.user);
      setCurrentLead(meData.lead);

      const stateRes = await fetch('/api/draft/state');
      if (stateRes.ok) {
        const stateData: DraftState = await stateRes.json();
        setDraftState(stateData);

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

    await fetchData(true);

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

  const openPreview = (candidate: Candidate) => {
    setPreviewCandidate(candidate);
    setIsModalOpen(true);
  };

  const departments = useMemo(() => {
    if (!draftState?.candidates) return [];
    const depts = new Set<string>();
    draftState.candidates.forEach((c) => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts);
  }, [draftState?.candidates]);

  const filteredCandidates = useMemo(() => {
    if (!draftState?.candidates) return [];

    return draftState.candidates.filter((candidate) => {
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

      if (selectedDept !== 'all' && candidate.department !== selectedDept) {
        return false;
      }

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
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-500">Loading draft board...</p>
        </div>
      </div>
    );
  }

  const quotaProgress = currentLead && currentLead.quota > 0
    ? (stats.myPicks / currentLead.quota) * 100
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-950 flex flex-col">
      <Navbar
        user={currentUser}
        lead={currentLead}
        isLocked={draftState?.settings.isLocked}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Paused notice */}
        {draftState?.settings.isLocked && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Draft is currently paused by the administrator.</span>
          </div>
        )}

        {/* Hero Card */}
        <Card className="border-zinc-200 bg-white shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Candidate Selection Board
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  {currentLead
                    ? `Welcome, ${currentLead.name}. Select candidates to build your team.`
                    : 'Candidate pool overview.'}
                </p>
              </div>

              {currentLead && (
                <Button
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>My Squad ({stats.myPicks} / {currentLead.quota})</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {currentLead && (
            <CardContent className="pt-0">
              <div className="pt-4 border-t border-zinc-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-600 font-medium">
                    Quota: {stats.myPicks} of {currentLead.quota} selected
                  </span>
                  <span className="text-zinc-500">
                    {Math.max(0, currentLead.quota - stats.myPicks)} slots remaining
                  </span>
                </div>
                <Progress value={quotaProgress} className="h-1.5" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search by name, role, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'available'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Available ({stats.available})
              </button>
              {currentLead && (
                <button
                  onClick={() => setStatusFilter('mine')}
                  className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                    statusFilter === 'mine'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  My Squad ({stats.myPicks})
                </button>
              )}
            </div>

            {departments.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 text-xs px-3 rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-950"
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

        {/* Candidates Grid */}
        {filteredCandidates.length === 0 ? (
          <Card className="p-12 text-center bg-white border-zinc-200">
            <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900">
              No candidates found
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Try adjusting your search query or filter.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Card
                  key={candidate.id}
                  onClick={() => openPreview(candidate)}
                  className={`border transition-colors cursor-pointer bg-white flex flex-col justify-between ${
                    isAssignedToMe
                      ? 'border-emerald-300'
                      : isAssignedToOther
                      ? 'border-zinc-200 opacity-60'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-zinc-100 text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-zinc-900">
                            {candidate.name}
                          </CardTitle>
                          {candidate.role && (
                            <p className="text-xs text-zinc-500 truncate max-w-[170px] mt-0.5">
                              {candidate.role}
                            </p>
                          )}
                        </div>
                      </div>

                      {isAssignedToMe ? (
                        <Badge variant="success" className="text-[10px] shrink-0">
                          Selected
                        </Badge>
                      ) : isAssignedToOther ? (
                        <Badge variant="secondary" className="text-[10px] text-zinc-500 shrink-0">
                          Taken
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-normal text-zinc-500 shrink-0">
                          Available
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                      {candidate.department && (
                        <span className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-[11px]">
                          <Building className="w-3 h-3" /> {candidate.department}
                        </span>
                      )}
                      {candidate.experience && (
                        <span className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-[11px]">
                          {candidate.experience}
                        </span>
                      )}
                    </div>

                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 3).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-normal text-zinc-700 bg-zinc-100">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 3 && (
                          <span className="text-[10px] text-zinc-400 self-center">
                            +{candidate.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Details
                      </span>

                      {currentLead && !isAssigned && !isQuotaFull && !draftState?.settings.isLocked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePickCandidate(candidate.id);
                          }}
                          className="h-7 text-xs px-2.5"
                        >
                          Select
                        </Button>
                      )}

                      {isAssignedToOther && (
                        <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                          {candidate.assignedToLeadName || 'Other Lead'}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
