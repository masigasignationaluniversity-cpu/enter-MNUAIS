import type { AppState } from './types';
import { initialState } from './mockData';

const STORAGE_KEY = 'ais_state';

// Persist everything EXCEPT the live users list (re-fetched on login)
type PersistedState = Omit<AppState, 'users'>;

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw
      ? ({ ...initialState, ...(JSON.parse(raw) as PersistedState) })
      : { ...initialState };
    return { ...base, users: [] };
  } catch {
    return { ...initialState, users: [], currentUser: null };
  }
}

export function saveState(state: AppState): void {
  try {
    // Persist currentUser so session survives refresh; exclude live users list
    const { users: _u, ...rest } = state;
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
