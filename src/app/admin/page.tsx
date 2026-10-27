'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ExcelUploader } from '@/components/ExcelUploader';
import { CandidatePreviewModal } from '@/components/CandidatePreviewModal';
import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';

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

  // Selected candidate preview
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      if (meData.user?.role !== 'admin') {
        router.push('/draft');
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

  // Add / Upsert Lead
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
      await fetchData(true);
    } catch (err: any) {
      setLeadError(err.message || 'Error adding lead');
    } finally {
      setAddingLead(false);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Are you sure you want to remove ${leadName} from Team Leads? Any candidates they picked will be released back to the available pool.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/leads?id=${leadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete lead');
      await fetchData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Update Lead Custom Quota
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
      await fetchData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle Draft Lock
  const handleToggleLock = async () => {
    if (!draftState) return;
    try {
      const nextLocked = !draftState.settings.isLocked;
      const res = await fetch('/api/admin/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      if (!res.ok) throw new Error('Failed to update draft lock');
      await fetchData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reset Draft
  const handleResetDraft = async () => {
    const confirmation = prompt('Type "RESET" to confirm resetting all candidate picks:');
    if (confirmation !== 'RESET') return;

    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset draft');
      await fetchData(true);
      alert('All picks have been reset successfully.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Release Candidate as Admin
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

    await fetchData(true);
    setIsPreviewOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const totalCandidates = draftState?.candidates.length || 0;
  const pickedCandidates = draftState?.candidates.filter((c) => c.assignedToLeadId).length || 0;
  const availableCandidates = totalCandidates - pickedCandidates;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar user={currentUser} isLocked={draftState?.settings.isLocked} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Root Line Control Center
              </span>
              {refreshing && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Administrator Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage authorized team leads, upload candidate spreadsheets, adjust quotas, and export draft results.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleLock}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                draftState?.settings.isLocked
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {draftState?.settings.isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Resume Draft
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Pause Draft
                </>
              )}
            </button>

            <a
              href="/api/admin/export"
              download
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </a>

            <button
              onClick={handleResetDraft}
              className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold transition flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Picks
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Candidates
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {totalCandidates}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {draftState?.settings.uploadedFileName || 'No file uploaded'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Candidates Picked
            </span>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {pickedCandidates}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalCandidates > 0 ? `${Math.round((pickedCandidates / totalCandidates) * 100)}% of pool` : '0%'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available to Pick
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {availableCandidates}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Unassigned records</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Team Leads
            </span>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {draftState?.leads.length || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Whitelisted leads</p>
          </div>
        </div>

        {/* File Ingestion Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Candidate Spreadsheet Ingestion
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your Excel or CSV file. Quotas automatically split equally among active leads; odd remainders are randomly allocated.
              </p>
            </div>
          </div>

          <ExcelUploader
            onUploadSuccess={() => {
              fetchData(true);
            }}
          />
        </div>

        {/* Team Leads Whitelist Management */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Team Leads Whitelist & Quotas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only emails listed here can access the Team Lead draft portal. Quotas are auto-calculated but can be manually overridden.
              </p>
            </div>
          </div>

          {/* Add Lead Form */}
          <form
            onSubmit={handleAddLead}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-end gap-3"
          >
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Lead Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="lead@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="w-full md:w-36">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Custom Quota
              </label>
              <input
                type="number"
                min="1"
                placeholder="Auto"
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={addingLead}
              className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{addingLead ? 'Adding...' : 'Add Lead'}</span>
            </button>
          </form>

          {leadError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {leadError}
            </div>
          )}

          {/* Leads Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Quota</th>
                  <th className="py-3 px-4">Picks Claimed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {draftState?.leads.map((lead) => {
                  const isCustom = lead.customQuota !== undefined && lead.customQuota !== null;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-lg ${lead.avatarColor || 'bg-indigo-500'} text-white flex items-center justify-center text-xs font-bold`}>
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{lead.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {lead.email}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                          {lead.quota}
                        </span>
                        {isCustom && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 max-w-[140px]">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{
                                width: `${
                                  lead.quota > 0
                                    ? Math.min(100, (lead.pickedCount / lead.quota) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                            {lead.pickedCount}/{lead.quota}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingLead(lead);
                              setEditQuotaVal(
                                lead.customQuota !== undefined && lead.customQuota !== null
                                  ? String(lead.customQuota)
                                  : ''
                              );
                            }}
                            title="Edit Quota Override"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            title="Delete Lead"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teams Live Matrix View */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Live Squad Rosters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time matrix of candidates picked by each team lead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {draftState?.leads.map((lead) => {
              const squad = draftState.candidates.filter((c) => c.assignedToLeadId === lead.id);
              return (
                <div
                  key={lead.id}
                  className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg ${lead.avatarColor || 'bg-indigo-500'} text-white flex items-center justify-center font-bold text-xs`}>
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {lead.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {lead.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {squad.length} / {lead.quota}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {squad.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">
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
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {member.name}
                              </p>
                              {member.role && (
                                <p className="text-[10px] text-slate-400">
                                  {member.role}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-indigo-500 font-semibold">
                              View →
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Edit Quota Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              Edit Quota for {editingLead.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Leave blank to reset to auto equal split.
            </p>

            <input
              type="number"
              min="0"
              placeholder="e.g. 5 (or blank for auto)"
              value={editQuotaVal}
              onChange={(e) => setEditQuotaVal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingLead(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuota}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Save Quota
              </button>
            </div>
          </div>
        </div>
      )}

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
