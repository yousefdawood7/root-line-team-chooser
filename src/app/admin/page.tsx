'use client';

import { useReducer, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Download,
  RotateCcw,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  AlertCircle,
  RefreshCw,
  Printer,
  Check,
  X,
  UserCheck,
  Search,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExcelUploader } from '@/components/ExcelUploader';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { CandidateEditModal } from '@/components/CandidateEditModal';
import { adminReducer, initialAdminState } from '@/reducers/adminReducer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(adminReducer, initialAdminState);

  const {
    currentUser,
    draftState,
    loading,
    isEditingTitle,
    titleInputVal,
    newEmail,
    newName,
    newQuota,
    addingLead,
    leadError,
    editingLead,
    editQuotaVal,
    leadToDelete,
    isDeleteLeadDialogOpen,
    deletingLead,
    candidateToDelete,
    isDeleteCandidateDialogOpen,
    deletingCandidate,
    candidateToEdit,
    isCandidateEditModalOpen,
    candidateSearchQuery,
    candidateFilterStatus,
    isResetDialogOpen,
    resetting,
    selectedCandidate,
    isPreviewOpen,
    proposalActionLoading,
    downloadingId,
  } = state;

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user?.role !== 'admin') {
        router.push('/login');
        return;
      }

      const stateRes = await fetch('/api/draft/state');
      if (stateRes.ok) {
        const data = await stateRes.json();
        dispatch({ type: 'SET_LOAD_DATA', user: meData.user, state: data });
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
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
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Client-side PDF download with empty data guard
  const handleDownloadPdf = async (leadId?: string, leadName?: string) => {
    if (!draftState) return;

    // Check if data exists
    const candidatesToExport = leadId
      ? draftState.candidates.filter((c) => c.assignedToLeadId === leadId && c.approvalStatus !== 'pending')
      : draftState.candidates.filter((c) => c.approvalStatus !== 'pending');

    if (candidatesToExport.length === 0) {
      toast.error(
        leadName
          ? `No candidates in ${leadName}'s squad to export.`
          : 'No candidates available to export yet.'
      );
      return;
    }

    try {
      dispatch({ type: 'SET_DOWNLOADING_ID', id: `pdf_${leadId || 'all'}` });
      const url = leadId ? `/api/admin/pdf?leadId=${leadId}` : '/api/admin/pdf';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to download PDF');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const targetName = leadName ? leadName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Teams';
      link.download = `RootLine_Team_${targetName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(leadName ? `${leadName}'s PDF downloaded` : 'All Teams PDF downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download error');
    } finally {
      dispatch({ type: 'SET_DOWNLOADING_ID', id: null });
    }
  };

  // Client-side Excel download with empty data guard
  const handleDownloadExcel = async (leadId?: string, leadName?: string) => {
    if (!draftState) return;

    const candidatesToExport = leadId
      ? draftState.candidates.filter((c) => c.assignedToLeadId === leadId && c.approvalStatus !== 'pending')
      : draftState.candidates.filter((c) => c.approvalStatus !== 'pending');

    if (candidatesToExport.length === 0) {
      toast.error(
        leadName
          ? `No candidates in ${leadName}'s squad to export.`
          : 'No candidates available to export yet.'
      );
      return;
    }

    try {
      dispatch({ type: 'SET_DOWNLOADING_ID', id: `xlsx_${leadId || 'all'}` });
      const url = leadId ? `/api/admin/export?leadId=${leadId}` : '/api/admin/export';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to download Excel');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const targetName = leadName ? leadName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Teams';
      link.download = `RootLine_Team_${targetName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(leadName ? `${leadName}'s Excel downloaded` : 'All Teams Excel downloaded');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download error');
    } finally {
      dispatch({ type: 'SET_DOWNLOADING_ID', id: null });
    }
  };

  // Client-side print navigation with empty data check
  const handlePrintNavigation = (leadId?: string) => {
    if (!draftState) return;
    const candidatesToPrint = leadId
      ? draftState.candidates.filter((c) => c.assignedToLeadId === leadId && c.approvalStatus !== 'pending')
      : draftState.candidates.filter((c) => c.approvalStatus !== 'pending');

    if (candidatesToPrint.length === 0) {
      toast.error('No candidate data to print.');
      return;
    }

    const url = leadId ? `/admin/print?leadId=${leadId}` : '/admin/print';
    router.push(url);
  };

  const handleSaveTitle = async () => {
    if (!titleInputVal.trim()) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInputVal.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update session title');
      dispatch({ type: 'CANCEL_EDIT_TITLE' });
      toast.success('Session title updated');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update title');
    }
  };

  const handleAddLead = async (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_LEAD_ERROR', error: null });
    dispatch({ type: 'SET_ADDING_LEAD', adding: true });

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          customQuota: newQuota ? Number(newQuota) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lead');

      dispatch({ type: 'RESET_NEW_LEAD_FORM' });
      toast.success('Team lead added successfully');
      await fetchData();
    } catch (err: unknown) {
      dispatch({ type: 'SET_LEAD_ERROR', error: err instanceof Error ? err.message : 'Error adding lead' });
    } finally {
      dispatch({ type: 'SET_ADDING_LEAD', adding: false });
    }
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;

    try {
      dispatch({ type: 'SET_DELETING_LEAD', deleting: true });
      const res = await fetch(`/api/admin/leads?id=${leadToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete lead');
      toast.success(`Removed team lead "${leadToDelete.name}"`);
      dispatch({ type: 'CLOSE_DELETE_LEAD_DIALOG' });
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead');
    } finally {
      dispatch({ type: 'SET_DELETING_LEAD', deleting: false });
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;

    try {
      dispatch({ type: 'SET_DELETING_CANDIDATE', deleting: true });
      const res = await fetch(`/api/admin/candidates?id=${candidateToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete candidate');
      toast.success(`Deleted candidate "${candidateToDelete.name}"`);
      dispatch({ type: 'CLOSE_DELETE_CANDIDATE_DIALOG' });
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete candidate');
    } finally {
      dispatch({ type: 'SET_DELETING_CANDIDATE', deleting: false });
    }
  };

  const handleUpdateQuota = async () => {
    if (!editingLead) return;
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingLead.email,
          name: editingLead.name,
          customQuota: editQuotaVal === '' ? null : Number(editQuotaVal),
        }),
      });
      if (!res.ok) throw new Error('Failed to update quota');
      dispatch({ type: 'CLOSE_EDIT_QUOTA' });
      toast.success('Quota updated');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update quota');
    }
  };

  const handleToggleLock = async () => {
    if (!draftState) return;
    try {
      const nextLocked = !draftState.settings.isLocked;
      const res = await fetch('/api/admin/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      if (!res.ok) throw new Error('Failed to update draft status');
      toast.info(nextLocked ? 'Draft paused' : 'Draft resumed');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update draft status');
    }
  };

  const confirmResetDraft = async () => {
    try {
      dispatch({ type: 'SET_RESETTING', resetting: true });
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset draft');
      dispatch({ type: 'CLOSE_RESET_DIALOG' });
      toast.success('All picks have been reset');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset draft');
    } finally {
      dispatch({ type: 'SET_RESETTING', resetting: false });
    }
  };

  const handleAdminReleaseCandidate = async (candidateId: string) => {
    const res = await fetch('/api/draft/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId }),
    });

    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to release');
    }

    toast.success('Candidate released to available pool');
    await fetchData();
    dispatch({ type: 'CLOSE_PREVIEW' });
  };

  const handleProcessProposal = async (candidateId: string, action: 'approve' | 'reject') => {
    try {
      dispatch({ type: 'SET_PROPOSAL_LOADING', id: candidateId });
      const res = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process proposal');

      toast.success(action === 'approve' ? 'Proposal approved & assigned' : 'Proposal rejected');
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process proposal');
    } finally {
      dispatch({ type: 'SET_PROPOSAL_LOADING', id: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-5 w-5 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingProposals = draftState?.candidates.filter(
    (c) => c.approvalStatus === 'pending'
  ) || [];

  const approvedCandidates = draftState?.candidates.filter(
    (c) => c.approvalStatus !== 'pending'
  ) || [];

  const totalCandidates = approvedCandidates.length;
  const pickedCandidates = approvedCandidates.filter((c) => c.assignedToLeadId).length;
  const availableCandidates = totalCandidates - pickedCandidates;

  // Filtered candidate list for management table
  const filteredCandidates = approvedCandidates.filter((c) => {
    if (candidateFilterStatus === 'assigned' && !c.assignedToLeadId) return false;
    if (candidateFilterStatus === 'available' && c.assignedToLeadId) return false;

    if (candidateSearchQuery.trim()) {
      const q = candidateSearchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = c.role?.toLowerCase().includes(q);
      const matchDept = c.department?.toLowerCase().includes(q);
      const matchLead = c.assignedToLeadName?.toLowerCase().includes(q);
      return matchName || matchRole || matchDept || matchLead;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-950 flex flex-col">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="text"
                    value={titleInputVal}
                    onChange={(e) => dispatch({ type: 'SET_TITLE_INPUT', val: e.target.value })}
                    className="h-8 text-sm font-bold max-w-xs bg-white"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveTitle} className="h-8 text-xs px-2.5">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'CANCEL_EDIT_TITLE' })}
                    className="h-8 text-xs px-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                    {draftState?.settings.title || 'Admin Dashboard'}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      dispatch({
                        type: 'START_EDIT_TITLE',
                        currentTitle: draftState?.settings.title || 'Root Line Team Draft',
                      });
                    }}
                    title="Edit session title"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage authorized leads, review member proposals, modify draft board candidates, and export rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate: null });
              }}
              className="flex items-center gap-1.5 cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Candidate</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              {draftState?.settings.isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Resume Selection
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Pause Selection
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="default"
              disabled={downloadingId === 'xlsx_all'}
              onClick={() => handleDownloadExcel()}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingId === 'xlsx_all' ? 'Exporting...' : 'Export All (Excel)'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={downloadingId === 'pdf_all'}
              onClick={() => handleDownloadPdf()}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{downloadingId === 'pdf_all' ? 'Generating...' : 'Download All (PDF)'}</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePrintNavigation()}
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-950 cursor-pointer text-xs"
            >
              Print Preview
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'OPEN_RESET_DIALOG' })}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset All
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-zinc-200 bg-white">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium uppercase text-zinc-400">
                Total Candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-zinc-900">{totalCandidates}</p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {draftState?.settings.uploadedFileName || 'No file uploaded'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium uppercase text-zinc-400">
                Candidates Claimed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-zinc-900">{pickedCandidates}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {totalCandidates > 0 ? `${Math.round((pickedCandidates / totalCandidates) * 100)}% of total` : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium uppercase text-zinc-400">
                Available Candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-zinc-900">{availableCandidates}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Unassigned pool</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-medium uppercase text-zinc-400">
                Pending Proposals
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold text-zinc-900">{pendingProposals.length}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Proposals Review Panel */}
        {pendingProposals.length > 0 && (
          <Card className="border-zinc-900 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Pending Candidate Proposals ({pendingProposals.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Custom candidates proposed by team leads outside the spreadsheet. Approving assigns them directly to that lead.
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-xs">
                  Action Required
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-zinc-200">
                {pendingProposals.map((proposal) => {
                  const isProcessing = proposalActionLoading === proposal.id;
                  return (
                    <div key={proposal.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900">
                            {proposal.name}
                          </h4>
                          {proposal.role && (
                            <Badge variant="secondary" className="text-[11px]">
                              {proposal.role}
                            </Badge>
                          )}
                          {proposal.department && (
                            <Badge variant="outline" className="text-[11px] text-zinc-500">
                              {proposal.department}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500">
                          Proposed by: <strong className="text-zinc-800">{proposal.proposedByLeadName}</strong> ({proposal.proposedByLeadEmail})
                        </p>

                        {(proposal.email || proposal.phone || proposal.notes) && (
                          <div className="text-xs text-zinc-600 mt-1 space-x-3">
                            {proposal.email && <span>Email: {proposal.email}</span>}
                            {proposal.phone && <span>Phone: {proposal.phone}</span>}
                            {proposal.notes && <span className="italic">Note: &ldquo;{proposal.notes}&rdquo;</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => handleProcessProposal(proposal.id, 'reject')}
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={isProcessing}
                          onClick={() => handleProcessProposal(proposal.id, 'approve')}
                          className="h-8 text-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve & Assign
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Ingestion with Column Mapping */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Candidate Spreadsheet Ingestion
            </CardTitle>
            <CardDescription className="text-xs">
              Upload an Excel or CSV file. Choose which column represents Candidate Name / Title so timestamps are never used as card titles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelUploader onUploadSuccess={() => fetchData()} />
          </CardContent>
        </Card>

        {/* Full Draft Board Candidate Roster Management */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Draft Board Candidates ({approvedCandidates.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Edit candidate details, re-assign them to any team lead, return them to the open pool, or permanently delete them.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => {
                dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate: null });
              }}
              className="text-xs h-8 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Candidate Manually</span>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search by name, role, department, or lead..."
                  value={candidateSearchQuery}
                  onChange={(e) => dispatch({ type: 'SET_CANDIDATE_SEARCH', query: e.target.value })}
                  className="pl-8 bg-white h-8 text-xs"
                />
              </div>

              <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
                <button
                  onClick={() => dispatch({ type: 'SET_CANDIDATE_FILTER', status: 'all' })}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-xs ${
                    candidateFilterStatus === 'all'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  All ({totalCandidates})
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_CANDIDATE_FILTER', status: 'assigned' })}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-xs ${
                    candidateFilterStatus === 'assigned'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Assigned ({pickedCandidates})
                </button>
                <button
                  onClick={() => dispatch({ type: 'SET_CANDIDATE_FILTER', status: 'available' })}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer text-xs ${
                    candidateFilterStatus === 'available'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Available ({availableCandidates})
                </button>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50">
                    <TableHead className="font-semibold text-xs w-10">#</TableHead>
                    <TableHead className="font-semibold text-xs">Candidate Name / Title</TableHead>
                    <TableHead className="font-semibold text-xs">Assigned Lead</TableHead>
                    <TableHead className="font-semibold text-xs">Role</TableHead>
                    <TableHead className="font-semibold text-xs">Department</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-400 text-xs">
                        No candidates match your filter. Click &ldquo;Add Candidate Manually&rdquo; to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((candidate, idx) => (
                      <TableRow key={candidate.id} className="hover:bg-zinc-50/70">
                        <TableCell className="font-mono text-xs text-zinc-400">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-xs text-zinc-900">
                          {candidate.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {candidate.assignedToLeadName ? (
                            <Badge variant="secondary" className="font-medium text-xs">
                              Assigned: {candidate.assignedToLeadName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="font-normal text-xs text-zinc-500">
                              Available Pool
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600">
                          {candidate.role || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-600">
                          {candidate.department || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate });
                              }}
                              title="Edit candidate & reassignment"
                              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                dispatch({ type: 'OPEN_DELETE_CANDIDATE_DIALOG', candidate });
                              }}
                              title="Delete candidate"
                              className="h-7 w-7 text-zinc-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Team Leads Whitelist Management */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Team Leads Whitelist
            </CardTitle>
            <CardDescription className="text-xs">
              Manage authorized leads and quota allocations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add Lead Form */}
            <form onSubmit={handleAddLead} className="flex flex-col sm:flex-row items-end gap-2.5 p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[11px] font-medium text-zinc-600 uppercase">
                  Lead Email *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="lead@company.com"
                  value={newEmail}
                  onChange={(e) => dispatch({ type: 'SET_NEW_LEAD_FIELD', field: 'newEmail', value: e.target.value })}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <div className="flex-1 w-full space-y-1">
                <label className="text-[11px] font-medium text-zinc-600 uppercase">
                  Display Name
                </label>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => dispatch({ type: 'SET_NEW_LEAD_FIELD', field: 'newName', value: e.target.value })}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-28 space-y-1">
                <label className="text-[11px] font-medium text-zinc-600 uppercase">
                  Custom Quota
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Auto"
                  value={newQuota}
                  onChange={(e) => dispatch({ type: 'SET_NEW_LEAD_FIELD', field: 'newQuota', value: e.target.value })}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <Button type="submit" disabled={addingLead} size="sm" className="w-full sm:w-auto h-8 text-xs cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-1" />
                {addingLead ? 'Adding...' : 'Add Lead'}
              </Button>
            </form>

            {leadError && (
              <div className="p-2.5 rounded-md bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leadError}</span>
              </div>
            )}

            {/* Leads Table */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50">
                    <TableHead className="font-semibold text-xs">Lead</TableHead>
                    <TableHead className="font-semibold text-xs">Email</TableHead>
                    <TableHead className="font-semibold text-xs text-center">Quota</TableHead>
                    <TableHead className="font-semibold text-xs">Progress</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftState?.leads.map((lead) => {
                    const isCustom = lead.customQuota !== undefined && lead.customQuota !== null;
                    const progressVal = lead.quota > 0 ? (lead.pickedCount / lead.quota) * 100 : 0;

                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium text-xs text-zinc-900">
                          {lead.name}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-mono">
                          {lead.email}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="font-bold text-zinc-900">{lead.quota}</span>
                          {isCustom && (
                            <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 font-normal text-zinc-500">
                              Custom
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2 max-w-[130px]">
                            <Progress value={progressVal} className="h-1.5 flex-1" />
                            <span className="text-[11px] text-zinc-500 font-mono">
                              {lead.pickedCount}/{lead.quota}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                dispatch({ type: 'OPEN_EDIT_QUOTA', lead });
                              }}
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-900 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                dispatch({ type: 'OPEN_DELETE_LEAD_DIALOG', lead });
                              }}
                              className="h-7 w-7 text-zinc-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Live Rosters with Per-Lead PDF & Excel Export */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Current Team Rosters
            </CardTitle>
            <CardDescription className="text-xs">
              Live view of candidates picked by each team lead with dedicated export options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {draftState?.leads.map((lead) => {
                const squad = draftState.candidates.filter(
                  (c) => c.assignedToLeadId === lead.id && c.approvalStatus !== 'pending'
                );

                return (
                  <div key={lead.id} className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{lead.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{lead.email}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {squad.length} / {lead.quota}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 max-h-52 overflow-y-auto mt-2">
                        {squad.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic py-4 text-center">
                            No candidates drafted yet
                          </p>
                        ) : (
                          squad.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => {
                                dispatch({ type: 'OPEN_PREVIEW', candidate: member });
                              }}
                              className="p-2 rounded-md bg-white border border-zinc-200 flex items-center justify-between text-xs cursor-pointer hover:border-zinc-400 transition"
                            >
                              <span className="font-medium text-zinc-900 truncate max-w-[140px]">{member.name}</span>
                              <span className="text-[10px] text-zinc-400">View →</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Per-Lead Export Actions with in-place client handling & toast */}
                    <div className="pt-2 border-t border-zinc-200 flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingId === `xlsx_${lead.id}`}
                        onClick={() => handleDownloadExcel(lead.id, lead.name)}
                        className="h-7 text-xs px-2 text-zinc-600 hover:text-zinc-950 cursor-pointer"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        <span>{downloadingId === `xlsx_${lead.id}` ? '...' : 'Excel'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === `pdf_${lead.id}`}
                        onClick={() => handleDownloadPdf(lead.id, lead.name)}
                        className="h-7 text-xs px-2 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        <span>{downloadingId === `pdf_${lead.id}` ? '...' : 'PDF'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Quota Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/30 backdrop-blur-xs">
          <Card className="max-w-sm w-full bg-white border-zinc-200 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Edit Quota for {editingLead.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Leave blank to use automatic equal split.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                min="0"
                placeholder="Auto"
                value={editQuotaVal}
                onChange={(e) => dispatch({ type: 'SET_EDIT_QUOTA_VAL', val: e.target.value })}
                className="bg-white text-xs h-8"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'CLOSE_EDIT_QUOTA' })}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateQuota}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={(open) => !open && dispatch({ type: 'CLOSE_RESET_DIALOG' })}>
        <DialogContent className="max-w-md bg-white border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950">
              Reset All Candidate Picks
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              This action will unassign all candidates from their current team leads and return them to the available pool. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'CLOSE_RESET_DIALOG' })}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmResetDraft}
              disabled={resetting}
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Picks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shadcn Dialog: Remove Team Lead Confirmation */}
      <Dialog open={isDeleteLeadDialogOpen} onOpenChange={(open) => !open && dispatch({ type: 'CLOSE_DELETE_LEAD_DIALOG' })}>
        <DialogContent className="max-w-md bg-white border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950">
              Remove Team Lead
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Are you sure you want to remove <strong>{leadToDelete?.name}</strong> ({leadToDelete?.email})? Any candidates assigned to them will be returned to the open candidate pool.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'CLOSE_DELETE_LEAD_DIALOG' })}
              disabled={deletingLead}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDeleteLead}
              disabled={deletingLead}
            >
              {deletingLead ? 'Removing...' : 'Yes, Remove Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shadcn Dialog: Delete Candidate Confirmation */}
      <Dialog open={isDeleteCandidateDialogOpen} onOpenChange={(open) => !open && dispatch({ type: 'CLOSE_DELETE_CANDIDATE_DIALOG' })}>
        <DialogContent className="max-w-md bg-white border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950">
              Delete Candidate from Draft Board
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Are you sure you want to permanently delete <strong>{candidateToDelete?.name}</strong>? This action will remove them from the draft board and adjust team quotas accordingly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'CLOSE_DELETE_CANDIDATE_DIALOG' })}
              disabled={deletingCandidate}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDeleteCandidate}
              disabled={deletingCandidate}
            >
              {deletingCandidate ? 'Deleting...' : 'Yes, Delete Candidate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Add & Edit Candidate Modal */}
      <CandidateEditModal
        isOpen={isCandidateEditModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_CANDIDATE_EDIT_MODAL' })}
        onSuccess={() => fetchData()}
        candidateToEdit={candidateToEdit}
        leads={draftState?.leads || []}
      />

      {/* Candidate Preview Modal for Admin */}
      <CandidatePreviewModal
        candidate={selectedCandidate}
        currentUser={currentUser}
        currentLead={null}
        isOpen={isPreviewOpen}
        onClose={() => dispatch({ type: 'CLOSE_PREVIEW' })}
        onPick={async () => {}}
        onRelease={handleAdminReleaseCandidate}
        onEdit={(cand) => {
          dispatch({ type: 'OPEN_CANDIDATE_EDIT_MODAL', candidate: cand });
        }}
        onDelete={async (id) => {
          const cand = approvedCandidates.find((c) => c.id === id);
          if (cand) {
            dispatch({ type: 'OPEN_DELETE_CANDIDATE_DIALOG', candidate: cand });
          }
        }}
        isDraftLocked={draftState?.settings.isLocked}
      />
    </div>
  );
}
