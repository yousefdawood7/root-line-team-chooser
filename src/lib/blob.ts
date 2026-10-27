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
      avatarColor: 'bg-indigo-500',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lead-2',
      email: 'lead2@rootline.com',
      name: 'Team Lead 2',
      avatarColor: 'bg-emerald-500',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ],
  candidates: [],
  settings: INITIAL_SETTINGS,
  version: 1,
};

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Ensure local directory exists
function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

// In-memory mutex for synchronous local state operations
let stateLock: Promise<any> = Promise.resolve();

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
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not read from Vercel Blob, checking fallback:', err);
    }
  }

  // Local fallback
  ensureLocalDir();
  if (fs.existsSync(LOCAL_STATE_FILE)) {
    try {
      const content = fs.readFileSync(LOCAL_STATE_FILE, 'utf-8');
      return JSON.parse(content) as DraftState;
    } catch (e) {
      console.error('Error reading local state file:', e);
    }
  }

  // If no state exists yet, save initial state and return it
  await saveDraftState(INITIAL_STATE);
  return INITIAL_STATE;
}

/**
 * Persist draft state to Vercel Blob or local storage
 */
export async function saveDraftState(state: DraftState): Promise<void> {
  state.version = (state.version || 0) + 1;
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
      console.error('Failed writing to Vercel Blob, saving locally:', err);
    }
  }

  // Local fallback
  ensureLocalDir();
  fs.writeFileSync(LOCAL_STATE_FILE, jsonContent, 'utf-8');
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

    if (candidate.assignedToLeadId) {
      return {
        success: false,
        error: `Candidate already picked by ${candidate.assignedToLeadName || 'another lead'}.`,
      };
    }

    // Check quota
    const currentPicks = state.candidates.filter((c) => c.assignedToLeadId === currentLead.id).length;
    if (currentLead.quota > 0 && currentPicks >= currentLead.quota) {
      return {
        success: false,
        error: `You have reached your quota limit of ${currentLead.quota} candidates.`,
      };
    }

    // Assign candidate
    candidate.assignedToLeadId = currentLead.id;
    candidate.assignedToLeadName = currentLead.name;
    candidate.assignedToLeadEmail = currentLead.email;
    candidate.assignedAt = new Date().toISOString();

    // Recalculate lead picked counts
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
 * Release/Unpick a candidate
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
      return { success: true }; // already free
    }

    // Verify permission: Must be Admin OR the lead who picked the candidate
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
 * Admin action: Save updated candidate list from uploaded file & re-apportion quotas
 */
export async function importCandidates(
  candidates: Candidate[],
  filename: string
): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    state.candidates = candidates;
    state.settings.uploadedFileName = filename;
    state.settings.uploadedAt = new Date().toISOString();
    state.settings.totalCandidates = candidates.length;

    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

/**
 * Admin action: Reset all draft picks
 */
export async function resetDraftPicks(): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    for (const c of state.candidates) {
      c.assignedToLeadId = null;
      c.assignedToLeadName = null;
      c.assignedToLeadEmail = null;
      c.assignedAt = null;
    }
    state.leads = recalculateQuotas(state.leads, state.candidates);
    await saveDraftState(state);
    return state;
  });
}

/**
 * Admin action: Add or update a lead
 */
export async function upsertLead(leadData: {
  email: string;
  name?: string;
  customQuota?: number | null;
}): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    const normalizedEmail = leadData.email.trim().toLowerCase();

    const existingIndex = state.leads.findIndex((l) => l.email.toLowerCase() === normalizedEmail);

    const colors = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-purple-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-cyan-500',
      'bg-teal-500',
    ];

    if (existingIndex >= 0) {
      state.leads[existingIndex] = {
        ...state.leads[existingIndex],
        name: leadData.name?.trim() || state.leads[existingIndex].name,
        customQuota: leadData.customQuota,
      };
    } else {
      const color = colors[state.leads.length % colors.length];
      const newLead: Lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: normalizedEmail,
        name: leadData.name?.trim() || normalizedEmail.split('@')[0],
        avatarColor: color,
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

/**
 * Admin action: Delete a lead
 */
export async function removeLead(leadId: string): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();

    // Release any candidates picked by this lead
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

/**
 * Admin action: Toggle draft lock
 */
export async function setDraftLock(isLocked: boolean): Promise<DraftState> {
  return withLock(async () => {
    const state = await getDraftState();
    state.settings.isLocked = isLocked;
    await saveDraftState(state);
    return state;
  });
}
