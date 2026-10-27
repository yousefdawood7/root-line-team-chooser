'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ProposeCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProposeCandidateModal({
  isOpen,
  onClose,
  onSuccess,
}: ProposeCandidateModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Candidate Name is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/candidates/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          role: role.trim() || undefined,
          department: department.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          skills: skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit proposal');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setName('');
        setRole('');
        setDepartment('');
        setEmail('');
        setPhone('');
        setSkills('');
        setNotes('');
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error submitting proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
      <Card className="max-w-lg w-full bg-white border-zinc-200 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Propose Custom Member
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Propose an outside candidate to join your team. Requires administrator approval.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 h-7 w-7 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name is ONLY REQUIRED FIELD */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-900 block">
                Candidate Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                autoFocus
                placeholder="Full Name (required)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 block">
                  Role / Title (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Frontend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 block">
                  Department (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="bg-white h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 block">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="candidate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600 block">
                  Phone (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="+1 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 block">
                Skills / Tags (Optional, comma-separated)
              </label>
              <Input
                type="text"
                placeholder="React, TypeScript, Design"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="bg-white h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600 block">
                Notes / Justification (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Reason or background for proposing this candidate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Proposal submitted for administrator review!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || success}>
                {loading ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
