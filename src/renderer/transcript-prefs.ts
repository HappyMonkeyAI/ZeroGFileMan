import {
  parseTranscriptDrawerState,
  type TranscriptDrawerState
} from '../shared/transcript-drawer.js';

const STORAGE_KEY = 'zerogfileman.transcript-drawer';

export function loadStoredTranscriptDrawer(): TranscriptDrawerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return parseTranscriptDrawerState(null);
    return parseTranscriptDrawerState(JSON.parse(raw));
  } catch {
    return parseTranscriptDrawerState(null);
  }
}

export function storeTranscriptDrawer(state: TranscriptDrawerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseTranscriptDrawerState(state)));
  } catch {
    /* ignore */
  }
}
