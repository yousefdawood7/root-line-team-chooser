'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Candidate, DraftState, Lead } from '@/lib/types';

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
        if (authData.user?.role !== 'admin') {
          router.push('/draft');
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

  useEffect(() => {
    if (!loading && draftState) {
      const docName = targetLead
        ? `RootLine_Team_${targetLead.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : `RootLine_All_Teams_${new Date().toISOString().slice(0, 10)}`;
      document.title = docName;

      // Auto trigger print after short render delay
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, draftState, targetLead]);

  if (loading || !draftState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          <p className="text-xs text-zinc-500">Preparing document for print...</p>
        </div>
      </div>
    );
  }

  const leadsToRender = targetLead
    ? [targetLead]
    : draftState.leads;

  return (
    <div className="min-h-screen bg-white text-zinc-950 p-8 sm:p-12 print:p-0">
      {/* Top Toolbar (Hidden on print) */}
      <div className="no-print max-w-4xl mx-auto mb-8 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 relative rounded-lg border border-zinc-200 bg-zinc-950 flex items-center justify-center p-1 shrink-0">
              <Image
                src="/logo.svg"
                alt="Root Line"
                width={48}
                height={48}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                Root Line Team Chooser
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">
                Official Roster Documentation
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-zinc-500 font-mono">
            <p>Generated: {new Date().toLocaleDateString()}</p>
            <p>{new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Lead Squads */}
        {leadsToRender.map((lead) => {
          const members = draftState.candidates.filter(
            (c) => c.assignedToLeadId === lead.id
          );

          return (
            <div key={lead.id} className="space-y-4 break-inside-avoid">
              <div className="flex items-end justify-between border-b border-zinc-200 pb-2">
                <div>
                  <h2 className="text-lg font-bold text-zinc-950">
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
                <p className="text-xs text-zinc-400 italic py-4">
                  No members drafted for this team yet.
                </p>
              ) : (
                <table className="w-full text-left text-xs border border-zinc-200 border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 font-semibold text-zinc-700">
                      <th className="py-2 px-3 w-10">#</th>
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
        <div className="pt-10 border-t border-zinc-200 mt-12 grid grid-cols-2 gap-8 text-xs break-inside-avoid">
          <div>
            <p className="text-zinc-500 mb-6">Administrator Signature:</p>
            <div className="border-b border-zinc-400 w-3/4 mb-1" />
            <p className="text-zinc-400 font-mono">Date Verified</p>
          </div>
          <div>
            <p className="text-zinc-500 mb-6">Organization Verification:</p>
            <div className="border-b border-zinc-400 w-3/4 mb-1" />
            <p className="text-zinc-400 font-mono">Root Line Team Chooser</p>
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
