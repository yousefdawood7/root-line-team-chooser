'use client';

import { useReducer, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Users,
  Building,
  Eye,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  Plus,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { CandidateEditModal } from '@/components/CandidateEditModal';
import { MyTeamDrawer } from '@/components/MyTeamDrawer';
import { ProposeCandidateModal } from '@/components/ProposeCandidateModal';
import { Candidate } from '@/lib/types';
import { draftReducer, initialDraftBoardState } from '@/reducers/draftReducer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function DraftPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(draftReducer, initialDraftBoardState);

  const {
    currentUser,
    currentLead,
    draftState,
    loading,
    searchQuery,
    statusFilter,
    selectedDept,
    previewCandidate,
    isModalOpen,
    isDrawerOpen,
    isProposeOpen,
    candidateToEdit,
    isEditModalOpen,
  } = state;

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();

      const stateRes = await fetch('/api/draft/state');
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        let resolvedLead = meData.lead;
        if (meData.user?.role === 'lead') {
          const freshLead = stateData.leads?.find(
            (l: { id: string; email: string }) =>
              l.id === meData.user.leadId || l.email.toLowerCase() === meData.user.email.toLowerCase()
          );
          if (freshLead) resolvedLead = freshLead;
        }

        dispatch({
          type: 'SET_LOAD_DATA',
          user: meData.user,
          lead: resolvedLead,
          draftState: stateData,
        });
      }
    } catch (err) {
      console.error('Failed to fetch draft data:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [router]);

  useEffect(() => {
    const run = async () => {
      await fetchData();
    };
    run();
    const interval = setInterval(() => {
      run();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

    await fetchData();

    if (previewCandidate && previewCandidate.id === candidateId && data.candidate) {
      dispatch({ type: 'UPDATE_PREVIEW_CANDIDATE', candidate: data.candidate });
    }
  };

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

    await fetchData();

    if (previewCandidate && previewCandidate.id === candidateId) {
      dispatch({
        type: 'UPDATE_PREVIEW_CANDIDATE',
        candidate: {
          ...previewCandidate,
          assignedToLeadId: null,
          assignedToLeadName: null,
          assignedToLeadEmail: null,
          assignedAt: null,
        },
      });
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    const res = await fetch(`/api/admin/candidates?id=${candidateId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete candidate');
    }
    toast.success('Candidate permanently deleted');
    await fetchData();
  };

  const openPreview = (candidate: Candidate) => {
    dispatch({ type: 'OPEN_PREVIEW', candidate });
  };

  // Only show approved candidates in public catalog
  const candidatesList = draftState?.candidates;
  const approvedCandidates = useMemo(() => {
    if (!candidatesList) return [];
    return candidatesList.filter((c) => c.approvalStatus !== 'pending');
  }, [candidatesList]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    approvedCandidates.forEach((c) => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts);
  }, [approvedCandidates]);

  const filteredCandidates = useMemo(() => {
    return approvedCandidates.filter((candidate) => {
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
  }, [approvedCandidates, searchQuery, selectedDept, statusFilter, currentLead]);

  const stats = useMemo(() => {
    const total = approvedCandidates.length;
    const claimed = approvedCandidates.filter((c) => c.assignedToLeadId).length;
    const available = total - claimed;
    const myPicks = currentLead
      ? approvedCandidates.filter((c) => c.assignedToLeadId === currentLead.id).length
      : 0;
    return { total, available, claimed, myPicks };
  }, [approvedCandidates, currentLead]);

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

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-950 flex flex-col">
      <Navbar
        user={currentUser}
        lead={currentLead}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
                  {draftState?.settings.title || 'Candidate Selection Board'}
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  {currentLead
                    ? `Welcome, ${currentLead.name}. Select candidates or propose outside members.`
                    : 'Live candidate selection and roster overview.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate: null });
                    }}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Candidate</span>
                  </Button>
                )}

                {currentLead && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_PROPOSE_OPEN', open: true })}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Propose Member</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => dispatch({ type: 'SET_DRAWER_OPEN', open: true })}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>My Squad ({stats.myPicks} / {currentLead.quota})</span>
                    </Button>
                  </>
                )}
              </div>
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
              placeholder="Search by candidate name, role, skills..."
              value={searchQuery}
              onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', query: e.target.value })}
              className="pl-9 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
              <button
                onClick={() => dispatch({ type: 'SET_STATUS_FILTER', filter: 'all' })}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_STATUS_FILTER', filter: 'available' })}
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
                  onClick={() => dispatch({ type: 'SET_STATUS_FILTER', filter: 'mine' })}
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
                onChange={(e) => dispatch({ type: 'SET_SELECTED_DEPT', dept: e.target.value })}
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

        {/* Candidates Grid with Prominent Assigned-By Attribution */}
        {filteredCandidates.length === 0 ? (
          <Card className="p-12 text-center bg-white border-zinc-200">
            <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-900">
              No candidates found
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Try adjusting your search query or department filter.
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
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : isAssignedToOther
                      ? 'border-zinc-200 opacity-75'
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

                      {/* Prominent Status / Assigned-By Badge */}
                      {isAssignedToMe ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="success" className="text-[10px] font-semibold">
                            Assigned to: You
                          </Badge>
                          {candidate.assignmentType === 'auto' && (
                            <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-200">
                              Auto
                            </Badge>
                          )}
                        </div>
                      ) : isAssignedToOther ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-zinc-900 bg-zinc-100 border border-zinc-200 shrink-0 font-medium max-w-[140px] truncate"
                          title={`Assigned to: ${candidate.assignedToLeadName}${candidate.assignmentType === 'auto' ? ' (Auto-Assigned)' : ''}`}
                        >
                          Assigned: {candidate.assignedToLeadName} {candidate.assignmentType === 'auto' ? '(Auto)' : ''}
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

                    {/* Attribution & Actions Footer */}
                    <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                      {isAssignedToOther ? (
                        <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[160px]">
                          {candidate.assignmentType === 'auto' ? 'Auto-assigned to: ' : 'Drafted by: '}
                          <strong className="text-zinc-900">{candidate.assignedToLeadName}</strong>
                        </span>
                      ) : isAssignedToMe ? (
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {candidate.assignmentType === 'auto' ? 'Auto-assigned to: ' : 'Drafted by: '}
                          <strong>Your Team</strong>
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Details
                        </span>
                      )}

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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Candidate Preview Modal with Edit and Delete options for Admin */}
      <CandidatePreviewModal
        candidate={previewCandidate}
        currentUser={currentUser}
        currentLead={currentLead}
        isOpen={isModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_PREVIEW' })}
        onPick={handlePickCandidate}
        onRelease={handleReleaseCandidate}
        onEdit={(cand) => {
          dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate: cand });
        }}
        onDelete={handleDeleteCandidate}
        isDraftLocked={draftState?.settings.isLocked}
      />

      {/* Candidate Manual Add & Edit Modal */}
      <CandidateEditModal
        isOpen={isEditModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_CANDIDATE_EDIT_MODAL' })}
        onSuccess={() => fetchData()}
        candidateToEdit={candidateToEdit}
        leads={draftState?.leads || []}
      />

      {/* My Team Drawer */}
      <MyTeamDrawer
        isOpen={isDrawerOpen}
        onClose={() => dispatch({ type: 'SET_DRAWER_OPEN', open: false })}
        lead={currentLead}
        candidates={draftState?.candidates || []}
        onSelectCandidate={openPreview}
        onReleaseCandidate={handleReleaseCandidate}
      />

      {/* Propose Candidate Modal */}
      <ProposeCandidateModal
        isOpen={isProposeOpen}
        onClose={() => dispatch({ type: 'SET_PROPOSE_OPEN', open: false })}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
