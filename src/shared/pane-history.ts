/** Pure history stack helpers for per-pane Back/Forward. */

export type HistoryState = {
  history: string[];
  historyIndex: number;
};

export function initialHistory(path: string): HistoryState {
  return { history: [path], historyIndex: 0 };
}

export function canGoBack(state: HistoryState): boolean {
  return state.historyIndex > 0;
}

export function canGoForward(state: HistoryState): boolean {
  return state.historyIndex < state.history.length - 1;
}

/** Record a new navigation, dropping any forward entries. */
export function pushPath(state: HistoryState, path: string): HistoryState {
  if (state.history[state.historyIndex] === path) return state;
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(path);
  return { history, historyIndex: history.length - 1 };
}

export function peekBack(state: HistoryState): string | null {
  if (!canGoBack(state)) return null;
  return state.history[state.historyIndex - 1] ?? null;
}

export function peekForward(state: HistoryState): string | null {
  if (!canGoForward(state)) return null;
  return state.history[state.historyIndex + 1] ?? null;
}

export function stepBack(state: HistoryState): HistoryState | null {
  if (!canGoBack(state)) return null;
  return { ...state, historyIndex: state.historyIndex - 1 };
}

export function stepForward(state: HistoryState): HistoryState | null {
  if (!canGoForward(state)) return null;
  return { ...state, historyIndex: state.historyIndex + 1 };
}

export function currentPath(state: HistoryState): string {
  return state.history[state.historyIndex] ?? state.history[0] ?? '';
}
