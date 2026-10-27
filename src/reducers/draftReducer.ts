import { Candidate, DraftState, Lead, UserSession } from '@/lib/types';

export interface DraftBoardState {
  currentUser: UserSession | null;
  currentLead: Lead | null;
  draftState: DraftState | null;
  loading: boolean;

  // Filter & Search states
  searchQuery: string;
  statusFilter: 'all' | 'available' | 'mine' | 'others';
  selectedDept: string;

  // Modal & Drawer states
  previewCandidate: Candidate | null;
  isModalOpen: boolean;
  isDrawerOpen: boolean;
  isProposeOpen: boolean;

  // Manual Add & Edit Candidate Modal
  candidateToEdit: Candidate | null;
  isEditModalOpen: boolean;
}

export type DraftBoardAction =
  | {
      type: 'SET_LOAD_DATA';
      user: UserSession;
      lead: Lead | null;
      draftState: DraftState;
    }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_CURRENT_LEAD'; lead: Lead | null }
  | { type: 'SET_DRAFT_STATE'; draftState: DraftState }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_STATUS_FILTER'; filter: 'all' | 'available' | 'mine' | 'others' }
  | { type: 'SET_SELECTED_DEPT'; dept: string }
  | { type: 'OPEN_PREVIEW'; candidate: Candidate }
  | { type: 'CLOSE_PREVIEW' }
  | { type: 'UPDATE_PREVIEW_CANDIDATE'; candidate: Candidate }
  | { type: 'SET_DRAWER_OPEN'; open: boolean }
  | { type: 'SET_PROPOSE_OPEN'; open: boolean }
  | { type: 'OPEN_CANDIDATE_EDIT_MODAL'; candidate?: Candidate | null }
  | { type: 'CLOSE_CANDIDATE_EDIT_MODAL' };

export const initialDraftBoardState: DraftBoardState = {
  currentUser: null,
  currentLead: null,
  draftState: null,
  loading: true,
  searchQuery: '',
  statusFilter: 'all',
  selectedDept: 'all',
  previewCandidate: null,
  isModalOpen: false,
  isDrawerOpen: false,
  isProposeOpen: false,
  candidateToEdit: null,
  isEditModalOpen: false,
};

export function draftReducer(
  state: DraftBoardState,
  action: DraftBoardAction
): DraftBoardState {
  switch (action.type) {
    case 'SET_LOAD_DATA': {
      const isStale =
        Boolean(state.draftState) &&
        Boolean(action.draftState) &&
        typeof action.draftState.version === 'number' &&
        typeof state.draftState?.version === 'number' &&
        action.draftState.version < (state.draftState?.version || 0);

      if (isStale) {
        return {
          ...state,
          currentUser: action.user,
          currentLead: action.lead,
          loading: false,
        };
      }

      return {
        ...state,
        currentUser: action.user,
        currentLead: action.lead,
        draftState: action.draftState,
        loading: false,
      };
    }

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_CURRENT_LEAD':
      return { ...state, currentLead: action.lead };

    case 'SET_DRAFT_STATE': {
      const isStale =
        Boolean(state.draftState) &&
        Boolean(action.draftState) &&
        typeof action.draftState.version === 'number' &&
        typeof state.draftState?.version === 'number' &&
        action.draftState.version < (state.draftState?.version || 0);

      if (isStale) {
        return state;
      }

      return { ...state, draftState: action.draftState };
    }

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };

    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.filter };

    case 'SET_SELECTED_DEPT':
      return { ...state, selectedDept: action.dept };

    case 'OPEN_PREVIEW':
      return {
        ...state,
        previewCandidate: action.candidate,
        isModalOpen: true,
      };

    case 'CLOSE_PREVIEW':
      return {
        ...state,
        previewCandidate: null,
        isModalOpen: false,
      };

    case 'UPDATE_PREVIEW_CANDIDATE':
      return {
        ...state,
        previewCandidate: action.candidate,
      };

    case 'SET_DRAWER_OPEN':
      return { ...state, isDrawerOpen: action.open };

    case 'SET_PROPOSE_OPEN':
      return { ...state, isProposeOpen: action.open };

    case 'OPEN_CANDIDATE_EDIT_MODAL':
      return {
        ...state,
        candidateToEdit: action.candidate || null,
        isEditModalOpen: true,
      };

    case 'CLOSE_CANDIDATE_EDIT_MODAL':
      return {
        ...state,
        candidateToEdit: null,
        isEditModalOpen: false,
      };

    default:
      return state;
  }
}
