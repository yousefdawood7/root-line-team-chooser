import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { Candidate, DraftSettings, DraftState, Lead } from './types';
import { recalculateQuotas } from './quota';

const BLOB_STATE_FILENAME = 'rootline_state_v1.json';
const LOCAL_DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_STATE_FILE = path.join(LOCAL_DATA_DIR, 'state.json');

const INITIAL_SETTINGS: DraftSettings = {
  id: 'default_draft',
  title: 'Root Line Team Draft',
  isLocked: false,
  totalCandidates: 0,
};

const INITIAL_STATE: DraftState = {
  leads: [
    {
      id: 'lead-1',
      email: 'lead1@rootline.com',
      name: 'Team Lead 1',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lead-2',
      email: 'lead2@rootline.com',
      name: 'Team Lead 2',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  candidates: [],
  settings: INITIAL_SETTINGS,
  version: 1,
};

// In-memory fallback if both Vercel Blob and filesystem are unavailable
let memoryState: DraftState = JSON.parse(JSON.stringify(INITIAL_STATE));

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeEnsureLocalDir(): boolean {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
    return true;
  } catch {
    // Read-only filesystem (e.g. Vercel serverless environment)
    return false;
  }
}

let stateLock: Promise<unknown> = Promise.resolve();

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const nextLock = stateLock.then(() => fn(), () => fn());
  stateLock = nextLock.catch(() => {});
  return nextLock;
}

/**
 * Fetch current state from Vercel Blob or local storage
 */
export async function getDraftState(): Promise<DraftState> {
  if (hasBlobToken()) {
    try {
      const { blobs } = await list({ prefix: BLOB_STATE_FILENAME, limit: 1 });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as DraftState;
          memoryState = data;
          return data;
        }
      } else {
        // Blob store exists but no state file has been created yet: initialize it directly in Blob!
        await put(BLOB_STATE_FILENAME, JSON.stringify(INITIAL_STATE, null, 2), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
        });
        memoryState = JSON.parse(JSON.stringify(INITIAL_STATE));
        return INITIAL_STATE;
      }
    } catch (err) {
      console.warn('Vercel Blob access error, checking local/memory:', err);
    }
  }

  // Local fallback (only for local development)
  if (safeEnsureLocalDir()) {
    try {
      if (fs.existsSync(LOCAL_STATE_FILE)) {
        const content = fs.readFileSync(LOCAL_STATE_FILE, 'utf-8');
        const parsed = JSON.parse(content) as DraftState;
        memoryState = parsed;
        return parsed;
      }
      fs.writeFileSync(LOCAL_STATE_FILE, JSON.stringify(INITIAL_STATE, null, 2), 'utf-8');
      return INITIAL_STATE;
    } catch {
      console.warn('Filesystem access failed, using memory state');
    }
  }

  return memoryState;
}

/**
 * Persist draft state to Vercel Blob or local storage
 */
export async function saveDraftState(state: DraftState): Promise<void> {
  state.version = (state.version || 0) + 1;
  memoryState = state;
  const jsonContent = JSON.stringify(state, null, 2);

  if (hasBlobToken()) {
    try {
      await put(BLOB_STATE_FILENAME, jsonContent, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      return;
    } catch (err) {
      console.error('Failed writing to Vercel Blob:', err);
    }
  }

  // Local fallback
  if (safeEnsureLocalDir()) {
    try {
      fs.writeFileSync(LOCAL_STATE_FILE, jsonContent, 'utf-8');
    } catch {
      console.warn('Could not write to local filesystem, state kept in memory');
    }
  }
}

/**
 * Concurrency-safe Candidate Picking Operation
 */
export async function claimCandidate(
  candidateId: string,
  lead: { id: string; email: string; name: string }
): Promise<{ success: boolean; error?: string; candidate?: Candidate; remainingQuota?: number }> {
  return withLock(async () => {
    const state = await getDraftState();

    if (state.settings.isLocked) {
      return { success: false, error: 'The draft is currently locked by the administrator.' };
    }

    const currentLead = state.leads.find((l) => l.id === lead.id || l.email.toLowerCase() === lead.email.toLowerCase());
    if (!currentLead) {
      return { success: false, error: 'Team lead not found in whitelist.' };
    }

    const candidate = state.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidate not found.' };
    }

    if (candidate.approvalStatus === 'pending') {
      return { success: false, error: 'This candidate is currently awaiting admin approval.' };
    }

    if (candidate.assignedToLeadId) {
      const typeLabel = candidate.assignmentType === 'auto' ? ' (Auto-assigned)' : '';
      return {
        success: false,
        error: `Candidate already assigned to ${candidate.assignedToLeadName || 'another lead'}${typeLabel}.`,
      };
    }

    const currentPicks = state.candidates.filter((c) => c.assignedToLeadId === currentLead.id).length;
    if (currentLead.quota > 0 && currentPicks >= currentLead.quota) {
      return {
        success: false,
        error: `You have reached your quota limit of ${currentLead.quota} candidates.`,
      };
    }

    candidate.assignedToLeadId = currentLead.id;
    candidate.assignedToLeadName = currentLead.name;
    candidate.assignedToLeadEmail = currentLead.email;
    candidate.assignedAt = new Date().toISOString();
    candidate.assignmentType = 'manual_pick';
    candidate.assignedByName = currentLead.name;

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    const remaining = Math.max(0, currentLead.quota - (currentPicks + 1));
    return {
      success: true,
      candidate,
      remainingQuota: remaining,
    };
  });
}

/**
 * Release a candidate back to pool
 */
export async function releaseCandidate(
  candidateId: string,
  caller: { id?: string; email?: string; isAdmin: boolean }
): Promise<{ success: boolean; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const candidate = state.candidates.find((c) => c.id === candidateId);

    if (!candidate) {
      return { success: false, error: 'Candidate not found.' };
    }

    if (!candidate.assignedToLeadId) {
      return { success: true };
    }

    if (!caller.isAdmin) {
      const isOwner =
        candidate.assignedToLeadId === caller.id ||
        (caller.email && candidate.assignedToLeadEmail?.toLowerCase() === caller.email.toLowerCase());
      if (!isOwner) {
        return { success: false, error: 'You do not have permission to release this candidate.' };
      }
    }

    candidate.assignedToLeadId = null;
    candidate.assignedToLeadName = null;
    candidate.assignedToLeadEmail = null;
    candidate.assignedAt = null;

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true };
  });
}

/**
 * Team Lead proposes a custom candidate outside the spreadsheet
 */
export async function proposeCandidate(
  data: {
    name: string;
    role?: string;
    department?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    notes?: string;
  },
  lead: { id: string; name: string; email: string }
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  const trimmedName = String(data.name || '').trim();
  if (!trimmedName) {
    return { success: false, error: 'Candidate name is required.' };
  }

  return withLock(async () => {
    const state = await getDraftState();

    const id = `cand_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCandidate: Candidate = {
      id,
      name: trimmedName,
      role: data.role?.trim() || undefined,
      department: data.department?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      skills: data.skills && data.skills.length > 0 ? data.skills : undefined,
      notes: data.notes?.trim() || undefined,
      rawDetails: {
        'Source': 'Custom Proposal',
        'Proposed By': lead.name,
        'Proposed By Email': lead.email,
      },
      assignedToLeadId: null,
      assignedToLeadName: null,
      assignedToLeadEmail: null,
      assignedAt: null,
      approvalStatus: 'pending',
      proposedByLeadId: lead.id,
      proposedByLeadName: lead.name,
      proposedByLeadEmail: lead.email,
      proposedAt: new Date().toISOString(),
    };

    state.candidates.push(newCandidate);
    await saveDraftState(state);

    return { success: true, candidate: newCandidate };
  });
}

/**
 * Admin approves a proposed candidate and assigns them directly to the proposing lead
 */
export async function approveProposal(
  candidateId: string
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const candidate = state.candidates.find((c) => c.id === candidateId);

    if (!candidate) {
      return { success: false, error: 'Candidate proposal not found.' };
    }

    if (candidate.approvalStatus !== 'pending') {
      return { success: false, error: 'Proposal is already processed.' };
    }

    candidate.approvalStatus = 'approved';

    if (candidate.proposedByLeadId) {
      const targetLead = state.leads.find((l) => l.id === candidate.proposedByLeadId);
      if (targetLead) {
        candidate.assignedToLeadId = targetLead.id;
        candidate.assignedToLeadName = targetLead.name;
        candidate.assignedToLeadEmail = targetLead.email;
        candidate.assignedAt = new Date().toISOString();
        candidate.assignmentType = 'proposal';
        candidate.assignedByName = 'Approved Proposal';

        const leadCurrentPicks = state.candidates.filter(
          (c) => c.assignedToLeadId === targetLead.id && c.id !== candidate.id
        ).length;
        if (targetLead.quota <= leadCurrentPicks) {
          targetLead.quota = leadCurrentPicks + 1;
          targetLead.customQuota = targetLead.quota;
        }
      }
    }

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true, candidate };
  });
}

/**
 * Admin rejects a proposed candidate
 */
export async function rejectProposal(
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const index = state.candidates.findIndex((c) => c.id === candidateId);

    if (index === -1) {
      return { success: false, error: 'Proposal not found.' };
    }

    state.candidates.splice(index, 1);
    await saveDraftState(state);

    return { success: true };
  });
}

export async function importCandidates(
  candidates: Candidate[],
  filename: string,
  sessionTitle?: string
): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    state.candidates = candidates;
    state.settings.uploadedFileName = filename;
    state.settings.uploadedAt = new Date().toISOString();
    state.settings.totalCandidates = candidates.length;
    if (sessionTitle && sessionTitle.trim()) {
      state.settings.title = sessionTitle.trim();
    }

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

/**
 * Add a candidate manually ("by hand")
 */
export async function addManualCandidate(data: {
  name: string;
  role?: string;
  department?: string;
  experience?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  notes?: string;
  assignToLeadId?: string | null;
}): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Candidate name is required.' };
    }

    const id = `cand_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let assignedLead: Lead | undefined;
    if (data.assignToLeadId) {
      assignedLead = state.leads.find((l) => l.id === data.assignToLeadId);
    }

    const newCandidate: Candidate = {
      id,
      name: trimmedName,
      role: data.role?.trim() || undefined,
      department: data.department?.trim() || undefined,
      experience: data.experience?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      skills: data.skills && data.skills.length > 0 ? data.skills : undefined,
      notes: data.notes?.trim() || undefined,
      rawDetails: {
        Source: 'Manual Addition',
        'Created At': new Date().toISOString(),
      },
      assignedToLeadId: assignedLead ? assignedLead.id : null,
      assignedToLeadName: assignedLead ? assignedLead.name : null,
      assignedToLeadEmail: assignedLead ? assignedLead.email : null,
      assignedAt: assignedLead ? new Date().toISOString() : null,
      assignmentType: assignedLead ? 'admin' : null,
      assignedByName: assignedLead ? 'Admin' : null,
      approvalStatus: 'approved',
    };

    state.candidates.push(newCandidate);
    state.settings.totalCandidates = state.candidates.filter((c) => c.approvalStatus !== 'pending').length;
    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true, candidate: newCandidate };
  });
}

/**
 * Modify any candidate across the draft board (edit details, reassign lead, or return to pool)
 */
export async function updateCandidate(
  candidateId: string,
  data: {
    name?: string;
    role?: string;
    department?: string;
    experience?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    notes?: string;
    assignedToLeadId?: string | null;
  }
): Promise<{ success: boolean; candidate?: Candidate; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const candidate = state.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidate not found.' };
    }

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) return { success: false, error: 'Candidate name cannot be empty.' };
      candidate.name = trimmed;
    }
    if (data.role !== undefined) candidate.role = data.role.trim() || undefined;
    if (data.department !== undefined) candidate.department = data.department.trim() || undefined;
    if (data.experience !== undefined) candidate.experience = data.experience.trim() || undefined;
    if (data.email !== undefined) candidate.email = data.email.trim() || undefined;
    if (data.phone !== undefined) candidate.phone = data.phone.trim() || undefined;
    if (data.skills !== undefined) candidate.skills = data.skills.length > 0 ? data.skills : undefined;
    if (data.notes !== undefined) candidate.notes = data.notes.trim() || undefined;

    // Handle reassignment or returning to open pool
    if (data.assignedToLeadId !== undefined) {
      if (!data.assignedToLeadId) {
        candidate.assignedToLeadId = null;
        candidate.assignedToLeadName = null;
        candidate.assignedToLeadEmail = null;
        candidate.assignedAt = null;
        candidate.assignmentType = null;
        candidate.assignedByName = null;
      } else {
        const targetLead = state.leads.find((l) => l.id === data.assignedToLeadId);
        if (targetLead) {
          candidate.assignedToLeadId = targetLead.id;
          candidate.assignedToLeadName = targetLead.name;
          candidate.assignedToLeadEmail = targetLead.email;
          candidate.assignedAt = new Date().toISOString();
          candidate.assignmentType = 'admin';
          candidate.assignedByName = 'Admin';
        }
      }
    }

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true, candidate };
  });
}

/**
 * Permanently delete a candidate from the draft board
 */
export async function deleteCandidate(
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();
    const index = state.candidates.findIndex((c) => c.id === candidateId);
    if (index === -1) {
      return { success: false, error: 'Candidate not found.' };
    }

    state.candidates.splice(index, 1);
    state.settings.totalCandidates = state.candidates.filter((c) => c.approvalStatus !== 'pending').length;
    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true };
  });
}

/**
 * Update draft board session settings (e.g. custom title or lock state)
 */
export async function updateDraftSettings(settingsUpdate: {
  title?: string;
  isLocked?: boolean;
}): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    if (settingsUpdate.title !== undefined) {
      state.settings.title = settingsUpdate.title.trim() || state.settings.title;
    }
    if (settingsUpdate.isLocked !== undefined) {
      state.settings.isLocked = settingsUpdate.isLocked;
    }
    await saveDraftState(state);
    return state;
  });
}

export async function resetDraftPicks(): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    for (const c of state.candidates) {
      c.assignedToLeadId = null;
      c.assignedToLeadName = null;
      c.assignedToLeadEmail = null;
      c.assignedAt = null;
      c.assignmentType = null;
      c.assignedByName = null;
    }
    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

/**
 * Concurrency-safe Auto-Distribution of all available candidates across leads up to quota
 */
export async function autoDistributePool(): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  return withLock(async () => {
    const state = await getDraftState();

    if (state.leads.length === 0) {
      return { success: false, assignedCount: 0, error: 'No team leads registered to assign candidates to.' };
    }

    // Always recalculate quotas first to ensure fair limits
    state.leads = recalculateQuotas(state.leads, state.candidates);

    const availableCandidates = state.candidates.filter(
      (c) => !c.assignedToLeadId && c.approvalStatus !== 'pending'
    );

    if (availableCandidates.length === 0) {
      return { success: false, assignedCount: 0, error: 'No available candidates left to auto-assign.' };
    }

    let assignedCount = 0;
    // Map current picks per lead
    const currentPicks = new Map<string, number>();
    for (const c of state.candidates) {
      if (c.assignedToLeadId) {
        currentPicks.set(c.assignedToLeadId, (currentPicks.get(c.assignedToLeadId) || 0) + 1);
      }
    }

    for (const candidate of availableCandidates) {
      // Find leads who still have remaining quota
      const eligibleLeads = state.leads.filter((l) => {
        const picks = currentPicks.get(l.id) || 0;
        return l.quota > 0 && picks < l.quota;
      });

      if (eligibleLeads.length === 0) break; // All quotas full

      // Sort leads with fewest picks first (balanced fill)
      eligibleLeads.sort((a, b) => {
        const picksA = currentPicks.get(a.id) || 0;
        const picksB = currentPicks.get(b.id) || 0;
        return picksA - picksB;
      });

      const chosenLead = eligibleLeads[0];
      candidate.assignedToLeadId = chosenLead.id;
      candidate.assignedToLeadName = chosenLead.name;
      candidate.assignedToLeadEmail = chosenLead.email;
      candidate.assignedAt = new Date().toISOString();
      candidate.assignmentType = 'auto';
      candidate.assignedByName = 'System Auto-Distribution';

      currentPicks.set(chosenLead.id, (currentPicks.get(chosenLead.id) || 0) + 1);
      assignedCount++;
    }

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);

    return { success: true, assignedCount };
  });
}

export async function upsertLead(leadData: {
  email: string;
  name?: string;
  customQuota?: number | null;
}): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    const normalizedEmail = leadData.email.trim().toLowerCase();
    const existingIndex = state.leads.findIndex((l) => l.email.toLowerCase() === normalizedEmail);

    if (existingIndex >= 0) {
      state.leads[existingIndex] = {
        ...state.leads[existingIndex],
        name: leadData.name?.trim() || state.leads[existingIndex].name,
        customQuota: leadData.customQuota,
      };
    } else {
      const newLead: Lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: normalizedEmail,
        name: leadData.name?.trim() || normalizedEmail.split('@')[0],
        quota: 0,
        customQuota: leadData.customQuota,
        pickedCount: 0,
        createdAt: new Date().toISOString(),
      };
      state.leads.push(newLead);
    }

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

export async function removeLead(leadId: string): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();

    for (const c of state.candidates) {
      if (c.assignedToLeadId === leadId) {
        c.assignedToLeadId = null;
        c.assignedToLeadName = null;
        c.assignedToLeadEmail = null;
        c.assignedAt = null;
      }
    }

    state.leads = state.leads.filter((l) => l.id !== leadId);
    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

export async function setDraftLock(isLocked: boolean): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    state.settings.isLocked = isLocked;
    await saveDraftState(state);
    return state;
  });
}
