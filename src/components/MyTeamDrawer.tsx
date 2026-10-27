'use client';

import React from 'react';
import { X, Users, User, ArrowRight, Trash2, Mail, Phone } from 'lucide-react';
import { Candidate, Lead } from '@/lib/types';

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
  if (!isOpen || !lead) return null;

  const teamMembers = candidates.filter((c) => c.assignedToLeadId === lead.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  My Team Roster
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {teamMembers.length} of {lead.quota} selected
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {teamMembers.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  No members selected yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Browse through the candidate pool and click "Pick for My Team" to draft candidates to your squad.
                </p>
              </div>
            ) : (
              teamMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-slate-50/50 dark:bg-slate-800/30 transition group flex items-center justify-between"
                >
                  <div
                    className="flex-1 cursor-pointer pr-3"
                    onClick={() => {
                      onSelectCandidate(member);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {member.name}
                      </h4>
                    </div>
                    {member.role && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {member.role}
                      </p>
                    )}
                    {(member.email || member.phone) && (
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
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
                    <button
                      onClick={() => onReleaseCandidate(member.id)}
                      title="Release candidate back to pool"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectCandidate(member);
                        onClose();
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Remaining Quota:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.max(0, lead.quota - teamMembers.length)} slots left
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    lead.quota > 0
                      ? Math.min(100, (teamMembers.length / lead.quota) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
