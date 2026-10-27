'use client';

import React from 'react';
import { X, User, Briefcase, Mail, Phone, Award, Building, Sparkles, CheckCircle2, Lock, AlertCircle, Trash2 } from 'lucide-react';
import { Candidate, Lead, UserSession } from '@/lib/types';

interface CandidatePreviewModalProps {
  candidate: Candidate | null;
  currentUser: UserSession | null;
  currentLead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onPick: (candidateId: string) => Promise<void>;
  onRelease: (candidateId: string) => Promise<void>;
  isDraftLocked?: boolean;
}

export function CandidatePreviewModal({
  candidate,
  currentUser,
  currentLead,
  isOpen,
  onClose,
  onPick,
  onRelease,
  isDraftLocked,
}: CandidatePreviewModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen || !candidate) return null;

  const isAssigned = Boolean(candidate.assignedToLeadId);
  const isAssignedToMe = Boolean(
    currentLead && candidate.assignedToLeadId === currentLead.id
  );
  const isAssignedToOther = isAssigned && !isAssignedToMe;
  const isQuotaReached = Boolean(
    currentLead && currentLead.quota > 0 && currentLead.pickedCount >= currentLead.quota
  );
  const canRelease = Boolean(
    isAssignedToMe || (currentUser?.role === 'admin' && isAssigned)
  );

  const handlePick = async () => {
    try {
      setLoading(true);
      setError(null);
      await onPick(candidate.id);
    } catch (err: any) {
      setError(err.message || 'Failed to pick candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!confirm(`Are you sure you want to release ${candidate.name} back to the pool?`)) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onRelease(candidate.id);
    } catch (err: any) {
      setError(err.message || 'Failed to release candidate');
    } finally {
      setLoading(false);
    }
  };

  // Filter rawDetails to exclude standard keys already shown above
  const standardKeys = new Set([
    'name',
    'fullname',
    'candidatename',
    'email',
    'mail',
    'phone',
    'mobile',
    'role',
    'position',
    'title',
    'department',
    'dept',
    'experience',
    'exp',
    'skills',
    'notes',
    'bio',
    'status',
  ]);

  const customFields = Object.entries(candidate.rawDetails || {}).filter(([k, v]) => {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !standardKeys.has(cleanKey) && String(v).trim().length > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-500/20">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {candidate.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {candidate.role && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                    <Briefcase className="w-3 h-3" />
                    {candidate.role}
                  </span>
                )}
                {candidate.department && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Building className="w-3 h-3" />
                    {candidate.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Banner */}
          {isAssignedToMe ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  This person is part of your team!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Picked on {candidate.assignedAt ? new Date(candidate.assignedAt).toLocaleString() : 'recently'}
                </p>
              </div>
            </div>
          ) : isAssignedToOther ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Already Claimed
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Picked by <strong>{candidate.assignedToLeadName || 'another Team Lead'}</strong> ({candidate.assignedToLeadEmail})
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                🟢 Available for Selection
              </span>
              {currentLead && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Your remaining quota: <strong>{Math.max(0, currentLead.quota - currentLead.pickedCount)}</strong>
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Quick Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidate.email && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {candidate.email}
                  </p>
                </div>
              </div>
            )}

            {candidate.phone && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Phone</p>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {candidate.phone}
                  </p>
                </div>
              </div>
            )}

            {candidate.experience && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Experience</p>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {candidate.experience}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Skills & Technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Bio */}
          {candidate.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Notes / Bio
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {candidate.notes}
              </p>
            </div>
          )}

          {/* All custom Excel columns */}
          {customFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Additional File Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customFields.map(([key, val], idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800"
                  >
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                      {key}
                    </p>
                    <p className="text-xs text-slate-800 dark:text-slate-200 break-words font-medium">
                      {String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-center justify-between gap-3">
          {canRelease ? (
            <button
              onClick={handleRelease}
              disabled={loading}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Release Candidate
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>

            {currentUser?.role === 'lead' && (
              <button
                onClick={handlePick}
                disabled={
                  loading ||
                  isAssigned ||
                  isQuotaReached ||
                  Boolean(isDraftLocked)
                }
                className={`text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm ${
                  isAssignedToMe
                    ? 'bg-emerald-600 text-white cursor-default'
                    : isAssignedToOther
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : isQuotaReached
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
                }`}
              >
                {loading ? (
                  'Locking...'
                ) : isAssignedToMe ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Selected
                  </>
                ) : isAssignedToOther ? (
                  <>
                    <Lock className="w-4 h-4" /> Already Taken
                  </>
                ) : isQuotaReached ? (
                  'Quota Full'
                ) : isDraftLocked ? (
                  'Draft Locked'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Pick for My Team
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
