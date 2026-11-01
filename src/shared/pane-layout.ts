/** Dual-pane workspace layout helpers (vertical / horizontal / maximize). */

export type WorkspaceLayout = 'split-v' | 'split-h';

export type PaneSide = 'left' | 'right';

export type WorkspaceLayoutState = {
  layout: WorkspaceLayout;
  /** Which pane fills the workspace, if any. */
  maximized: PaneSide | null;
  /** Fraction for the first pane along the split axis (0.2–0.8). */
  ratio: number;
};

export const DEFAULT_SPLIT_RATIO = 0.5;
export const SPLIT_RATIO_MIN = 0.2;
export const SPLIT_RATIO_MAX = 0.8;

export const LAYOUT_LABELS: Record<WorkspaceLayout, string> = {
  'split-v': 'Side by side',
  'split-h': 'Stacked'
};

export function isWorkspaceLayout(value: unknown): value is WorkspaceLayout {
  return value === 'split-v' || value === 'split-h';
}

export function isPaneSide(value: unknown): value is PaneSide {
  return value === 'left' || value === 'right';
}

export function clampSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPLIT_RATIO;
  return Math.min(SPLIT_RATIO_MAX, Math.max(SPLIT_RATIO_MIN, value));
}

export function parseWorkspaceLayoutState(raw: unknown): WorkspaceLayoutState {
  if (!raw || typeof raw !== 'object') {
    return { layout: 'split-v', maximized: null, ratio: DEFAULT_SPLIT_RATIO };
  }
  const source = raw as Partial<WorkspaceLayoutState>;
  return {
    layout: isWorkspaceLayout(source.layout) ? source.layout : 'split-v',
    maximized: isPaneSide(source.maximized) ? source.maximized : null,
    ratio: clampSplitRatio(typeof source.ratio === 'number' ? source.ratio : DEFAULT_SPLIT_RATIO)
  };
}

/** CSS grid template for the workspace (pane | gutter | pane), or single when maximized. */
export function workspaceGridTemplate(state: WorkspaceLayoutState): {
  columns: string;
  rows: string;
} {
  if (state.maximized) {
    return { columns: '1fr', rows: '1fr' };
  }
  const a = `${(state.ratio * 100).toFixed(2)}%`;
  const b = `${((1 - state.ratio) * 100).toFixed(2)}%`;
  if (state.layout === 'split-h') {
    return { columns: '1fr', rows: `${a} 6px ${b}` };
  }
  return { columns: `${a} 6px ${b}`, rows: '1fr' };
}

export function toggleMaximize(
  state: WorkspaceLayoutState,
  side: PaneSide
): WorkspaceLayoutState {
  return {
    ...state,
    maximized: state.maximized === side ? null : side
  };
}

export function setLayout(
  state: WorkspaceLayoutState,
  layout: WorkspaceLayout
): WorkspaceLayoutState {
  return { ...state, layout, maximized: null };
}
