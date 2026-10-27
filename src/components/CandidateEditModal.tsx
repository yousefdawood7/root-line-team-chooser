"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { UserPlus, Edit3, AlertCircle } from "lucide-react";
import { Candidate, DraftState, Lead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CandidateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedState?: DraftState) => void;
  candidateToEdit?: Candidate | null;
  leads: Lead[];
}

function CandidateEditForm({
  candidateToEdit,
  leads,
  onClose,
  onSuccess,
}: {
  candidateToEdit?: Candidate | null;
  leads: Lead[];
  onClose: () => void;
  onSuccess: (updatedState?: DraftState) => void;
}) {
  const isEditing = Boolean(candidateToEdit);

  const [name, setName] = useState(candidateToEdit?.name || "");
  const [role, setRole] = useState(candidateToEdit?.role || "");
  const [department, setDepartment] = useState(
    candidateToEdit?.department || "",
  );
  const [experience, setExperience] = useState(
    candidateToEdit?.experience || "",
  );
  const [email, setEmail] = useState(candidateToEdit?.email || "");
  const [phone, setPhone] = useState(candidateToEdit?.phone || "");
  const [skills, setSkills] = useState(
    candidateToEdit?.skills?.join(", ") || "",
  );
  const [notes, setNotes] = useState(candidateToEdit?.notes || "");
  const [assignedToLeadId, setAssignedToLeadId] = useState(
    candidateToEdit?.assignedToLeadId || "",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Candidate Name / Title is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parsedSkills = skills
        ? skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const payload = {
        name: trimmedName,
        role: role.trim() || undefined,
        department: department.trim() || undefined,
        experience: experience.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        skills: parsedSkills,
        notes: notes.trim() || undefined,
        assignedToLeadId: assignedToLeadId || null,
        assignToLeadId: assignedToLeadId || null,
      };

      const url = "/api/admin/candidates";
      const method = isEditing ? "PATCH" : "POST";
      const body = isEditing
        ? { id: candidateToEdit?.id, ...payload }
        : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save candidate");
      }

      toast.success(
        isEditing
          ? `Updated "${trimmedName}" successfully`
          : `Added "${trimmedName}" to draft board`,
      );
      onSuccess(data.state);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving candidate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
          {isEditing ? (
            <Edit3 className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>
            {isEditing ? "Edit Candidate Details" : "Add Candidate Manually"}
          </span>
        </DialogTitle>
        <DialogDescription className="text-xs text-zinc-500">
          {isEditing
            ? "Update candidate attributes, reassign to a team lead, or return to the open pool."
            : "Add a new candidate directly to the draft board without uploading a file."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
        {error && (
          <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Name / Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-900 block">
            Candidate Title / Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            required
            autoFocus
            placeholder="e.g. Alex Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white text-xs h-9 font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 block">
              Role / Track (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Software Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-white text-xs h-8"
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
              className="bg-white text-xs h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 block">
              Email Address (Optional)
            </label>
            <Input
              type="email"
              placeholder="candidate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white text-xs h-8"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 block">
              Phone Number (Optional)
            </label>
            <Input
              type="text"
              placeholder="+1 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-white text-xs h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 block">
              Experience (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. 3 years, Senior"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="bg-white text-xs h-8"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 block">
              Lead Assignment
            </label>
            <select
              value={assignedToLeadId}
              onChange={(e) => setAssignedToLeadId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
            >
              <option value="">[Unassigned Pool / Available]</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  Assign to: {lead.name} ({lead.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 block">
            Skills (Optional, comma-separated)
          </label>
          <Input
            type="text"
            placeholder="React, TypeScript, Node.js"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="bg-white text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 block">
            Notes / Bio (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Candidate background, interview notes, or special remarks..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-950 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Add Candidate"}
          </Button>
        </div>
      </form>
    </>
  );
}

export function CandidateEditModal({
  isOpen,
  onClose,
  onSuccess,
  candidateToEdit,
  leads,
}: CandidateEditModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white border-zinc-200">
        <CandidateEditForm
          key={candidateToEdit?.id || "new_candidate"}
          candidateToEdit={candidateToEdit}
          leads={leads}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
