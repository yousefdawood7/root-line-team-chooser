import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';

export interface StorageStatusInfo {
  backend: 'vercel_blob' | 'local_file' | 'memory';
  hasToken: boolean;
  isConnected: boolean;
  blobFileName?: string;
  blobCount?: number;
  error?: string;
}

export interface AdminState {
  currentUser: UserSession | null;
  draftState: DraftState | null;
  loading: boolean;
  storageStatus: StorageStatusInfo | null;

  // Title editing
  isEditingTitle: boolean;
  titleInputVal: string;

  // Add lead form
  newEmail: string;
  newName: string;
  newQuota: string;
  addingLead: boolean;
  leadError: string | null;

  // Edit lead modal
  editingLead: Lead | null;
  editQuotaVal: string;

  // Delete lead dialog
  leadToDelete: Lead | null;
  isDeleteLeadDialogOpen: boolean;
  deletingLead: boolean;

  // Delete candidate dialog
  candidateToDelete: Candidate | null;
  isDeleteCandidateDialogOpen: boolean;
  deletingCandidate: boolean;

  // Candidate add/edit modal
  candidateToEdit: Candidate | null;
  isCandidateEditModalOpen: boolean;

  // Candidate roster search & filter
  candidateSearchQuery: string;
  candidateFilterStatus: 'all' | 'assigned' | 'available';

  // Reset dialog
  isResetDialogOpen: boolean;
  resetting: boolean;

  // Auto-Assign Dialog
  isAutoAssignDialogOpen: boolean;
  autoAssigning: boolean;

  // Preview modal
  selectedCandidate: Candidate | null;
  isPreviewOpen: boolean;

  // Async indicators
  proposalActionLoading: string | null;
  downloadingId: string | null;
}

export type AdminAction =
  | { type: 'SET_LOAD_DATA'; user: UserSession; state: DraftState }
  | { type: 'SET_STORAGE_STATUS'; status: StorageStatusInfo }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_DRAFT_STATE'; state: DraftState }
  | { type: 'START_EDIT_TITLE'; currentTitle: string }
  | { type: 'CANCEL_EDIT_TITLE' }
  | { type: 'SET_TITLE_INPUT'; val: string }
  | { type: 'SET_NEW_LEAD_FIELD'; field: 'newEmail' | 'newName' | 'newQuota'; value: string }
  | { type: 'RESET_NEW_LEAD_FORM' }
  | { type: 'SET_ADDING_LEAD'; adding: boolean }
  | { type: 'SET_LEAD_ERROR'; error: string | null }
  | { type: 'OPEN_EDIT_QUOTA'; lead: Lead }
  | { type: 'CLOSE_EDIT_QUOTA' }
  | { type: 'SET_EDIT_QUOTA_VAL'; val: string }
  | { type: 'OPEN_DELETE_LEAD_DIALOG'; lead: Lead }
  | { type: 'CLOSE_DELETE_LEAD_DIALOG' }
  | { type: 'SET_DELETING_LEAD'; deleting: boolean }
  | { type: 'OPEN_DELETE_CANDIDATE_DIALOG'; candidate: Candidate }
  | { type: 'CLOSE_DELETE_CANDIDATE_DIALOG' }
  | { type: 'SET_DELETING_CANDIDATE'; deleting: boolean }
  | { type: 'OPEN_CANDIDATE_EDIT_MODAL'; candidate?: Candidate | null }
  | { type: 'CLOSE_CANDIDATE_EDIT_MODAL' }
  | { type: 'SET_CANDIDATE_SEARCH'; query: string }
  | { type: 'SET_CANDIDATE_FILTER'; status: 'all' | 'assigned' | 'available' }
  | { type: 'OPEN_RESET_DIALOG' }
  | { type: 'CLOSE_RESET_DIALOG' }
  | { type: 'SET_RESETTING'; resetting: boolean }
  | { type: 'OPEN_AUTO_ASSIGN_DIALOG' }
  | { type: 'CLOSE_AUTO_ASSIGN_DIALOG' }
  | { type: 'SET_AUTO_ASSIGNING'; assigning: boolean }
  | { type: 'OPEN_PREVIEW'; candidate: Candidate }
  | { type: 'CLOSE_PREVIEW' }
  | { type: 'SET_PROPOSAL_LOADING'; id: string | null }
  | { type: 'SET_DOWNLOADING_ID'; id: string | null };

export const initialAdminState: AdminState = {
  currentUser: null,
  draftState: null,
  loading: true,
  storageStatus: null,
  isEditingTitle: false,
  titleInputVal: '',
  newEmail: '',
  newName: '',
  newQuota: '',
  addingLead: false,
  leadError: null,
  editingLead: null,
  editQuotaVal: '',
  leadToDelete: null,
  isDeleteLeadDialogOpen: false,
  deletingLead: false,
  candidateToDelete: null,
  isDeleteCandidateDialogOpen: false,
  deletingCandidate: false,
  candidateToEdit: null,
  isCandidateEditModalOpen: false,
  candidateSearchQuery: '',
  candidateFilterStatus: 'all',
  isResetDialogOpen: false,
  resetting: false,
  isAutoAssignDialogOpen: false,
  autoAssigning: false,
  selectedCandidate: null,
  isPreviewOpen: false,
  proposalActionLoading: null,
  downloadingId: null,
};

export function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'SET_LOAD_DATA': {
      const isStale =
        Boolean(state.draftState) &&
        Boolean(action.state) &&
        typeof action.state.version === 'number' &&
        typeof state.draftState?.version === 'number' &&
        action.state.version < (state.draftState?.version || 0);

      if (isStale) {
        return {
          ...state,
          currentUser: action.user,
          loading: false,
        };
      }

      return {
        ...state,
        currentUser: action.user,
        draftState: action.state,
        titleInputVal: state.isEditingTitle ? state.titleInputVal : (action.state?.settings?.title || 'Rootline Team Draft'),
        loading: false,
      };
    }

    case 'SET_STORAGE_STATUS':
      return { ...state, storageStatus: action.status };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_DRAFT_STATE': {
      const isStale =
        Boolean(state.draftState) &&
        Boolean(action.state) &&
        typeof action.state.version === 'number' &&
        typeof state.draftState?.version === 'number' &&
        action.state.version < (state.draftState?.version || 0);

      if (isStale) {
        return state;
      }

      return {
        ...state,
        draftState: action.state,
        titleInputVal: state.isEditingTitle ? state.titleInputVal : (action.state?.settings?.title || 'Rootline Team Draft'),
      };
    }

    case 'START_EDIT_TITLE':
      return { ...state, isEditingTitle: true, titleInputVal: action.currentTitle };

    case 'CANCEL_EDIT_TITLE':
      return { ...state, isEditingTitle: false };

    case 'SET_TITLE_INPUT':
      return { ...state, titleInputVal: action.val };

    case 'SET_NEW_LEAD_FIELD':
      return { ...state, [action.field]: action.value };

    case 'RESET_NEW_LEAD_FORM':
      return { ...state, newEmail: '', newName: '', newQuota: '', leadError: null };

    case 'SET_ADDING_LEAD':
      return { ...state, addingLead: action.adding };

    case 'SET_LEAD_ERROR':
      return { ...state, leadError: action.error };

    case 'OPEN_EDIT_QUOTA':
      return {
        ...state,
        editingLead: action.lead,
        editQuotaVal:
          action.lead.customQuota !== undefined && action.lead.customQuota !== null
            ? String(action.lead.customQuota)
            : '',
      };

    case 'CLOSE_EDIT_QUOTA':
      return { ...state, editingLead: null, editQuotaVal: '' };

    case 'SET_EDIT_QUOTA_VAL':
      return { ...state, editQuotaVal: action.val };

    case 'OPEN_DELETE_LEAD_DIALOG':
      return { ...state, leadToDelete: action.lead, isDeleteLeadDialogOpen: true };

    case 'CLOSE_DELETE_LEAD_DIALOG':
      return { ...state, leadToDelete: null, isDeleteLeadDialogOpen: false };

    case 'SET_DELETING_LEAD':
      return { ...state, deletingLead: action.deleting };

    case 'OPEN_DELETE_CANDIDATE_DIALOG':
      return { ...state, candidateToDelete: action.candidate, isDeleteCandidateDialogOpen: true };

    case 'CLOSE_DELETE_CANDIDATE_DIALOG':
      return { ...state, candidateToDelete: null, isDeleteCandidateDialogOpen: false };

    case 'SET_DELETING_CANDIDATE':
      return { ...state, deletingCandidate: action.deleting };

    case 'OPEN_CANDIDATE_EDIT_MODAL':
      return {
        ...state,
        candidateToEdit: action.candidate || null,
        isCandidateEditModalOpen: true,
      };

    case 'CLOSE_CANDIDATE_EDIT_MODAL':
      return { ...state, candidateToEdit: null, isCandidateEditModalOpen: false };

    case 'SET_CANDIDATE_SEARCH':
      return { ...state, candidateSearchQuery: action.query };

    case 'SET_CANDIDATE_FILTER':
      return { ...state, candidateFilterStatus: action.status };

    case 'OPEN_RESET_DIALOG':
      return { ...state, isResetDialogOpen: true };

    case 'CLOSE_RESET_DIALOG':
      return { ...state, isResetDialogOpen: false };

    case 'SET_RESETTING':
      return { ...state, resetting: action.resetting };

    case 'OPEN_AUTO_ASSIGN_DIALOG':
      return { ...state, isAutoAssignDialogOpen: true };

    case 'CLOSE_AUTO_ASSIGN_DIALOG':
      return { ...state, isAutoAssignDialogOpen: false };

    case 'SET_AUTO_ASSIGNING':
      return { ...state, autoAssigning: action.assigning };

    case 'OPEN_PREVIEW':
      return { ...state, selectedCandidate: action.candidate, isPreviewOpen: true };

    case 'CLOSE_PREVIEW':
      return { ...state, selectedCandidate: null, isPreviewOpen: false };

    case 'SET_PROPOSAL_LOADING':
      return { ...state, proposalActionLoading: action.id };

    case 'SET_DOWNLOADING_ID':
      return { ...state, downloadingId: action.id };

    default:
      return state;
  }
}
