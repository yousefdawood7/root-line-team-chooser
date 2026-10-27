'use client';

import { useState } from 'react';
import { X, User, ArrowRight, Trash2, Mail, Phone } from 'lucide-react';
import { Candidate, Lead } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MyTeamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onReleaseCandidate: (candidateId: string) => Promise<void>;
}

export function MyTeamDrawer({
  isOpen,
  onClose,
  lead,
  candidates,
  onSelectCandidate,
  onReleaseCandidate,
}: MyTeamDrawerProps) {
  const [candidateToRelease, setCandidateToRelease] = useState<Candidate | null>(null);
  const [releasing, setReleasing] = useState(false);

  if (!isOpen || !lead) return null;

  const teamMembers = candidates.filter((c) => c.assignedToLeadId === lead.id);
  const progressPercent = lead.quota > 0 ? (teamMembers.length / lead.quota) * 100 : 0;

  const handleConfirmRelease = async () => {
    if (!candidateToRelease) return;
    try {
      setReleasing(true);
      await onReleaseCandidate(candidateToRelease.id);
      setCandidateToRelease(null);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/30 backdrop-blur-xs">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-xl border-l border-zinc-200 flex flex-col">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h3 className="font-bold text-sm text-zinc-950">
                  My Squad Roster
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {teamMembers.length} of {lead.quota} candidates selected
                </p>
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

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {teamMembers.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-2.5">
                    <User className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 mb-0.5">
                    No candidates selected yet
                  </p>
                  <p className="text-xs text-zinc-500">
                    Select candidates from the draft board to build your team roster.
                  </p>
                </div>
              ) : (
                teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-lg border border-zinc-200 hover:border-zinc-300 bg-white transition group flex items-center justify-between"
                  >
                    <div
                      className="flex-1 cursor-pointer pr-3"
                      onClick={() => {
                        onSelectCandidate(member);
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 font-mono">
                          #{index + 1}
                        </span>
                        <h4 className="text-xs font-semibold text-zinc-900 group-hover:underline">
                          {member.name}
                        </h4>
                      </div>
                      {member.role && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {member.role}
                        </p>
                      )}
                      {(member.email || member.phone) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                          {member.email && (
                            <span className="truncate max-w-[140px] flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {member.email}
                            </span>
                          )}
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {member.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCandidateToRelease(member)}
                        title="Release candidate"
                        className="text-zinc-400 hover:text-red-600 h-8 w-8 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onSelectCandidate(member);
                          onClose();
                        }}
                        className="text-zinc-400 hover:text-zinc-900 h-8 w-8 cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-zinc-200 bg-zinc-50/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Remaining Quota</span>
                <span className="font-semibold text-zinc-900">
                  {Math.max(0, lead.quota - teamMembers.length)} slots left
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Shadcn Dialog: Release Confirmation */}
      <Dialog open={Boolean(candidateToRelease)} onOpenChange={(open) => !open && setCandidateToRelease(null)}>
        <DialogContent className="max-w-md bg-white border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950">
              Release Candidate from Squad
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Are you sure you want to release <strong>{candidateToRelease?.name}</strong> back to the selection pool?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCandidateToRelease(null)}
              disabled={releasing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRelease}
              disabled={releasing}
            >
              {releasing ? 'Releasing...' : 'Release to Pool'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
