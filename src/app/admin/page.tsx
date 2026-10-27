'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  RefreshCw,
  Printer,
  Check,
  X,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExcelUploader } from '@/components/ExcelUploader';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';
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
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add lead form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newQuota, setNewQuota] = useState('');
  const [addingLead, setAddingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Edit lead modal
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editQuotaVal, setEditQuotaVal] = useState<string>('');

  // Reset Confirmation Dialog
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Selected candidate preview
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Proposal actions loading
  const [proposalActionLoading, setProposalActionLoading] = useState<string | null>(null);

  // Download loading indicator
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
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
      setCurrentUser(meData.user);

      const stateRes = await fetch('/api/draft/state');
      if (stateRes.ok) {
        const data = await stateRes.json();
        setDraftState(data);
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5000);
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
      setDownloadingId(`pdf_${leadId || 'all'}`);
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
    } catch (err: any) {
      toast.error(err.message || 'Download error');
    } finally {
      setDownloadingId(null);
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
      setDownloadingId(`xlsx_${leadId || 'all'}`);
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
    } catch (err: any) {
      toast.error(err.message || 'Download error');
    } finally {
      setDownloadingId(null);
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

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError(null);
    setAddingLead(true);

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

      setNewEmail('');
      setNewName('');
      setNewQuota('');
      toast.success('Team lead added successfully');
      await fetchData(true);
    } catch (err: any) {
      setLeadError(err.message || 'Error adding lead');
    } finally {
      setAddingLead(false);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to remove ${leadName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/leads?id=${leadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete lead');
      toast.success('Lead removed');
      await fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
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
      setEditingLead(null);
      toast.success('Quota updated');
      await fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
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
      await fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const confirmResetDraft = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset draft');
      setIsResetDialogOpen(false);
      toast.success('All picks have been reset');
      await fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
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
    await fetchData(true);
    setIsPreviewOpen(false);
  };

  const handleProcessProposal = async (candidateId: string, action: 'approve' | 'reject') => {
    try {
      setProposalActionLoading(candidateId);
      const res = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process proposal');

      toast.success(action === 'approve' ? 'Proposal approved & assigned' : 'Proposal rejected');
      await fetchData(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProposalActionLoading(null);
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

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-950 flex flex-col">
      <Navbar user={currentUser} isLocked={draftState?.settings.isLocked} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Admin Dashboard
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage authorized leads, review member proposals, and export rosters.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              className="flex items-center gap-1.5"
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
              onClick={() => setIsResetDialogOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
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

        {/* File Ingestion */}
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Candidate Spreadsheet
            </CardTitle>
            <CardDescription className="text-xs">
              Upload an Excel or CSV file. Quotas automatically divide equally among leads, with any odd remainder assigned to a lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExcelUploader onUploadSuccess={() => fetchData(true)} />
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
                  onChange={(e) => setNewEmail(e.target.value)}
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
                  onChange={(e) => setNewName(e.target.value)}
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
                  onChange={(e) => setNewQuota(e.target.value)}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <Button type="submit" disabled={addingLead} size="sm" className="w-full sm:w-auto h-8 text-xs">
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
                                setEditingLead(lead);
                                setEditQuotaVal(
                                  lead.customQuota !== undefined && lead.customQuota !== null
                                    ? String(lead.customQuota)
                                    : ''
                                );
                              }}
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-900"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLead(lead.id, lead.name)}
                              className="h-7 w-7 text-zinc-400 hover:text-red-600"
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
                                setSelectedCandidate(member);
                                setIsPreviewOpen(true);
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
                        <Printer className="w-3 h-3 mr-1" />
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
                onChange={(e) => setEditQuotaVal(e.target.value)}
                className="bg-white text-xs h-8"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingLead(null)}>
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
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
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
              onClick={() => setIsResetDialogOpen(false)}
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

      {/* Candidate Preview Modal for Admin */}
      <CandidatePreviewModal
        candidate={selectedCandidate}
        currentUser={currentUser}
        currentLead={null}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onPick={async () => {}}
        onRelease={handleAdminReleaseCandidate}
        isDraftLocked={draftState?.settings.isLocked}
      />
    </div>
  );
}
