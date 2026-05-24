import type { AppState } from './types';
import { initialState } from './mockData';

const STORAGE_KEY = 'ais_state';

type PersistedState = Omit<AppState, 'users' | 'currentUser'>;

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? ({ ...initialState, ...(JSON.parse(raw) as PersistedState) }) : { ...initialState };
    return { ...base, users: [], currentUser: null };
  } catch {
    return { ...initialState, users: [], currentUser: null };
  }
}

export function saveState(state: AppState): void {
  try {
    // Don't persist users or currentUser — those come from Supabase
    const { users: _u, currentUser: _cu, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // silent
  }
}

export function resetState(): AppState {
  const fresh = { ...initialState };
  saveState(fresh);
  return fresh;
}
