import type { AppState } from './types';
import { initialState } from './mockData';

const STORAGE_KEY = 'ais_state';
type PersistedState = Omit<AppState, 'users' | 'currentUser'>;

export function loadState(): AppState {
  try {
    localStorage.removeItem('ais_current_user');
    const raw = localStorage.getItem(STORAGE_KEY);
    const persisted = raw ? JSON.parse(raw) as PersistedState : {};
    return { ...initialState, ...persisted, users: [], currentUser: null };
  } catch {
    return { ...initialState, users: [], currentUser: null };
  }
}

export function saveState(state: AppState): void {
  try {
    const { users: _users, currentUser: _currentUser, ...persisted } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export function resetState(): AppState {
  const fresh = { ...initialState, users: [], currentUser: null };
  saveState(fresh);
  return fresh;
}
