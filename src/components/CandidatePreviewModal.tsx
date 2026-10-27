'use client';

import { useState } from 'react';
import { X, CheckCircle2, Lock, AlertCircle, Trash2 } from 'lucide-react';
import { Candidate, Lead, UserSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to pick candidate');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to release candidate');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xl font-bold">
              {candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950">
                {candidate.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {candidate.role && (
                  <Badge variant="secondary" className="font-medium text-xs">
                    {candidate.role}
                  </Badge>
                )}
                {candidate.department && (
                  <Badge variant="outline" className="font-normal text-xs text-zinc-600">
                    {candidate.department}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Banner */}
          {isAssignedToMe ? (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Assigned to your team.</span>
            </div>
          ) : isAssignedToOther ? (
            <div className="p-3 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center gap-2.5 text-xs text-zinc-700">
              <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>Assigned to <strong>{candidate.assignedToLeadName || 'another lead'}</strong>.</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs text-zinc-700">
              <span className="font-medium">Available for selection</span>
              {currentLead && (
                <span className="text-zinc-500">
                  Remaining slots: <strong>{Math.max(0, currentLead.quota - currentLead.pickedCount)}</strong>
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {candidate.email && (
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-zinc-400 font-medium block text-[11px] uppercase">Email</span>
                <span className="font-medium text-zinc-900 block mt-0.5 break-all">{candidate.email}</span>
              </div>
            )}
            {candidate.phone && (
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-zinc-400 font-medium block text-[11px] uppercase">Phone</span>
                <span className="font-medium text-zinc-900 block mt-0.5">{candidate.phone}</span>
              </div>
            )}
            {candidate.experience && (
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <span className="text-zinc-400 font-medium block text-[11px] uppercase">Experience</span>
                <span className="font-medium text-zinc-900 block mt-0.5">{candidate.experience}</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="font-normal text-xs text-zinc-800 bg-zinc-50">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Bio */}
          {candidate.notes && (
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                Notes
              </span>
              <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                {candidate.notes}
              </p>
            </div>
          )}

          {/* Custom Spreadsheet Columns */}
          {customFields.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
                Additional Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {customFields.map(([key, val], idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/50">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase block">{key}</span>
                    <span className="font-medium text-zinc-800 block mt-0.5 break-words">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          {canRelease ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRelease}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Release Candidate
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>

            {currentUser?.role === 'lead' && (
              <Button
                size="sm"
                variant={isAssignedToMe ? "secondary" : "default"}
                onClick={handlePick}
                disabled={loading || isAssigned || isQuotaReached || Boolean(isDraftLocked)}
              >
                {loading
                  ? 'Saving...'
                  : isAssignedToMe
                  ? 'Selected'
                  : isAssignedToOther
                  ? 'Unavailable'
                  : isQuotaReached
                  ? 'Quota Reached'
                  : 'Select for My Team'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
