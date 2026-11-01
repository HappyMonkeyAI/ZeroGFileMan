/** Collapsible transcript / action bus drawer prefs. */

export const TRANSCRIPT_HEIGHT_MIN = 72;
export const TRANSCRIPT_HEIGHT_MAX = 360;
export const TRANSCRIPT_HEIGHT_DEFAULT = 104;
export const TRANSCRIPT_COLLAPSED_HEIGHT = 28;

export type TranscriptDrawerState = {
  collapsed: boolean;
  height: number;
};

export const DEFAULT_TRANSCRIPT_DRAWER: TranscriptDrawerState = {
  collapsed: false,
  height: TRANSCRIPT_HEIGHT_DEFAULT
};

export function clampTranscriptHeight(value: number): number {
  if (!Number.isFinite(value)) return TRANSCRIPT_HEIGHT_DEFAULT;
  return Math.min(TRANSCRIPT_HEIGHT_MAX, Math.max(TRANSCRIPT_HEIGHT_MIN, Math.round(value)));
}

export function parseTranscriptDrawerState(raw: unknown): TranscriptDrawerState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TRANSCRIPT_DRAWER };
  const source = raw as Partial<TranscriptDrawerState>;
  return {
    collapsed: Boolean(source.collapsed),
    height: clampTranscriptHeight(
      typeof source.height === 'number' ? source.height : TRANSCRIPT_HEIGHT_DEFAULT
    )
  };
}

export function effectiveTranscriptHeight(
  state: TranscriptDrawerState,
  settingsOpen: boolean
): number {
  if (settingsOpen) return Math.max(state.height, 260);
  if (state.collapsed) return TRANSCRIPT_COLLAPSED_HEIGHT;
  return state.height;
}
