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
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  experience?: string;
  skills?: string[];
  notes?: string;
  rawDetails: Record<string, any>;
  assignedToLeadId?: string | null;
  assignedToLeadName?: string | null;
  assignedToLeadEmail?: string | null;
  assignedAt?: string | null;
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
