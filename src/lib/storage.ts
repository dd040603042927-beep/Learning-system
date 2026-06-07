import { makeSeedState } from "../data/seed";
import type { AppState } from "../types";

const STORAGE_KEY = "personal-learning-system:v1";

export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeSeedState();
    return JSON.parse(raw) as AppState;
  } catch {
    return makeSeedState();
  }
}

export function saveState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = makeSeedState();
  saveState(state);
  return state;
}

export function exportState(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `learning-system-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
