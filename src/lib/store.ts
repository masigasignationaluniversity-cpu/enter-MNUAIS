import type { AppState, User } from './types';
import { initialState } from './mockData';

const STORAGE_KEY = 'ais_state';
const CURRENT_USER_KEY = 'ais_current_user'; // Dedicated key — never touched by background loads

// Persist everything EXCEPT users list (re-fetched on login) and currentUser (kept separately)
type PersistedState = Omit<AppState, 'users' | 'currentUser'>;

/** Called ONLY by login() and logout() — ensures no background load can overwrite the logged-in user */
export function saveCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // silent
  }
}

export function loadCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const currentUser = loadCurrentUser();
    const base = raw
      ? ({ ...initialState, ...(JSON.parse(raw) as PersistedState), currentUser })
      : { ...initialState, currentUser };
    return { ...base, users: [] };
  } catch {
    return { ...initialState, users: [], currentUser: null };
  }
}

/** Background loads call this — safe to call from any tab because currentUser is stored separately */
export function saveState(state: AppState): void {
  try {
    // Exclude live users list AND currentUser (currentUser has its own dedicated key)
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
