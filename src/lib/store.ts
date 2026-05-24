import type { AppState } from './types';
import { initialState } from './mockData';

const STORAGE_KEY = 'ais_state';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initialState };
    return JSON.parse(raw) as AppState;
  } catch {
    return { ...initialState };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent
  }
}

export function resetState(): AppState {
  const fresh = { ...initialState };
  saveState(fresh);
  return fresh;
}
