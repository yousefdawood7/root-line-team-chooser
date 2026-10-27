'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Printer, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraftState } from '@/lib/types';

function PrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        if (!authData.authenticated || authData.user?.role !== 'admin') {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/draft/state');
        if (res.ok) {
          const state = await res.json();
          setDraftState(state);
        }
      } catch (err) {
        console.error('Print load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const targetLead = draftState?.leads.find((l) => l.id === leadId);

  const leadsToRender = targetLead
    ? [targetLead]
    : draftState?.leads || [];

  const totalMembersCount = (draftState?.candidates || []).filter(
    (c) => (targetLead ? c.assignedToLeadId === targetLead.id : Boolean(c.assignedToLeadId)) && c.approvalStatus !== 'pending'
  ).length;

  useEffect(() => {
    if (!loading && draftState && totalMembersCount > 0) {
      const docName = targetLead
        ? `RootLine_Team_${targetLead.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : `RootLine_All_Teams_${new Date().toISOString().slice(0, 10)}`;
      document.title = docName;

      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, draftState, targetLead, totalMembersCount]);

  if (loading || !draftState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          <p className="text-xs text-zinc-500">Preparing document layout...</p>
        </div>
      </div>
    );
  }

  if (totalMembersCount === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6 text-center">
        <div className="max-w-sm bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-base font-bold text-zinc-900">No Candidate Data</h2>
          <p className="text-xs text-zinc-500">
            {targetLead
              ? `${targetLead.name} has not drafted any candidates yet.`
              : 'No candidates have been assigned to any team yet.'}
          </p>
          <Button size="sm" onClick={() => router.push('/admin')} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 p-8 sm:p-12 print:p-0 font-sans">
      {/* Top Toolbar (Hidden on print) */}
      <div className="no-print max-w-4xl mx-auto mb-8 p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin')} className="text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
        </Button>
        <Button size="sm" onClick={() => window.print()} className="text-xs">
          <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save as PDF
        </Button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 relative rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.16)] flex items-center justify-center shrink-0">
              <Image
                src="/logo.svg"
                alt="Root Line"
                width={44}
                height={44}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Root Line Team Chooser
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono mt-0.5">
                Official Roster Report — {targetLead ? `${targetLead.name}'s Squad` : 'All Teams'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-zinc-500 font-mono">
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p className="text-[10px] text-zinc-400">INTERNAL USE ONLY</p>
          </div>
        </div>

        {/* Lead Squads */}
        {leadsToRender.map((lead) => {
          const members = draftState.candidates.filter(
            (c) => c.assignedToLeadId === lead.id && c.approvalStatus !== 'pending'
          );

          return (
            <div key={lead.id} className="space-y-3.5 break-inside-avoid">
              <div className="flex items-end justify-between border-b border-zinc-200 pb-2">
                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    Team Lead: {lead.name}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    {lead.email}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-zinc-900">
                    {members.length}
                  </span>
                  <span className="text-zinc-500"> / {lead.quota} candidates drafted</span>
                </div>
              </div>

              {members.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-3">
                  No candidates drafted for this squad.
                </p>
              ) : (
                <table className="w-full text-left text-xs border border-zinc-200 border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 font-semibold text-zinc-700">
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Candidate Name</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {members.map((member, idx) => (
                      <tr key={member.id} className="hover:bg-zinc-50">
                        <td className="py-2 px-3 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-zinc-900">{member.name}</td>
                        <td className="py-2 px-3 text-zinc-600">{member.role || '—'}</td>
                        <td className="py-2 px-3 text-zinc-600">{member.department || '—'}</td>
                        <td className="py-2 px-3 text-zinc-600 font-mono text-[11px]">{member.email || '—'}</td>
                        <td className="py-2 px-3 text-zinc-600 font-mono text-[11px]">{member.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {/* Signature & Verification Block */}
        <div className="pt-8 border-t border-zinc-200 mt-10 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
          <div>
            <p className="text-zinc-500 mb-6">Team Lead Acceptance:</p>
            <div className="border-b border-zinc-400 w-3/4 mb-1" />
            <p className="text-zinc-400 font-mono text-[11px]">Date & Signature</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-6">Root Line Administrator Verification:</p>
            <div className="border-b border-zinc-400 w-3/4 mb-1" />
            <p className="text-zinc-400 font-mono text-[11px]">Authorization</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
