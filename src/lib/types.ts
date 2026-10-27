export interface Lead {
  id: string;
  email: string;
  name: string;
  avatarColor?: string;
  quota: number;
  customQuota?: number | null;
  pickedCount: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string; // Only required field
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  experience?: string;
  skills?: string[];
  notes?: string;
  rawDetails: Record<string, unknown>;
  assignedToLeadId?: string | null;
  assignedToLeadName?: string | null;
  assignedToLeadEmail?: string | null;
  assignedAt?: string | null;
  // Proposal & Approval Workflow
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  proposedByLeadId?: string | null;
  proposedByLeadName?: string | null;
  proposedByLeadEmail?: string | null;
  proposedAt?: string | null;
}

export interface DraftSettings {
  id: string;
  title: string;
  isLocked: boolean;
  uploadedFileName?: string;
  uploadedAt?: string;
  totalCandidates: number;
}

export interface UserSession {
  role: 'admin' | 'lead';
  email: string;
  leadId?: string;
  name?: string;
}

export interface DraftState {
  leads: Lead[];
  candidates: Candidate[];
  settings: DraftSettings;
  version: number;
}
