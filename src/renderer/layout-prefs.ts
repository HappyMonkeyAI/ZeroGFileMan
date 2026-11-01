import {
  parseWorkspaceLayoutState,
  type WorkspaceLayoutState
} from '../shared/pane-layout.js';

const STORAGE_KEY = 'zerogfileman.workspace-layout';

export function loadStoredWorkspaceLayout(): WorkspaceLayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return parseWorkspaceLayoutState(null);
    return parseWorkspaceLayoutState(JSON.parse(raw));
  } catch {
    return parseWorkspaceLayoutState(null);
  }
}

export function storeWorkspaceLayout(state: WorkspaceLayoutState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseWorkspaceLayoutState(state)));
  } catch {
    /* ignore */
  }
}
