import {
  clampViewScale,
  DEFAULT_VIEW_SCALE,
  isListingViewMode,
  type ListingViewMode
} from '../shared/listing-view.js';
import {
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_KEY,
  isListingSortDir,
  isListingSortKey,
  type ListingSortDir,
  type ListingSortKey
} from '../shared/listing-sort.js';

export type PaneListingPrefs = {
  mode: ListingViewMode;
  scale: number;
  sortKey: ListingSortKey;
  sortDir: ListingSortDir;
};

export type StoredListingPrefs = {
  left: PaneListingPrefs;
  right: PaneListingPrefs;
};

const STORAGE_KEY = 'zerogfileman.listing';

export const DEFAULT_PANE_LISTING: PaneListingPrefs = {
  mode: 'details',
  scale: DEFAULT_VIEW_SCALE,
  sortKey: DEFAULT_SORT_KEY,
  sortDir: DEFAULT_SORT_DIR
};

export const DEFAULT_LISTING_PREFS: PaneListingPrefs = DEFAULT_PANE_LISTING;

function parsePaneListingPrefs(raw: unknown): PaneListingPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PANE_LISTING };
  const source = raw as Partial<PaneListingPrefs>;
  return {
    mode: isListingViewMode(source.mode) ? source.mode : DEFAULT_PANE_LISTING.mode,
    scale: clampViewScale(typeof source.scale === 'number' ? source.scale : DEFAULT_VIEW_SCALE),
    sortKey: isListingSortKey(source.sortKey) ? source.sortKey : DEFAULT_PANE_LISTING.sortKey,
    sortDir: isListingSortDir(source.sortDir) ? source.sortDir : DEFAULT_PANE_LISTING.sortDir
  };
}

export function parseListingPrefs(raw: unknown): StoredListingPrefs {
  if (!raw || typeof raw !== 'object') {
    return { left: { ...DEFAULT_PANE_LISTING }, right: { ...DEFAULT_PANE_LISTING } };
  }
  const source = raw as Record<string, unknown>;
  if (source.left || source.right) {
    return {
      left: parsePaneListingPrefs(source.left),
      right: parsePaneListingPrefs(source.right)
    };
  }
  // Legacy flat { mode, scale } → both panes
  const shared = parsePaneListingPrefs(raw);
  return { left: { ...shared }, right: { ...shared } };
}

export function loadStoredListingPrefs(): StoredListingPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return parseListingPrefs(null);
    return parseListingPrefs(JSON.parse(raw));
  } catch {
    return parseListingPrefs(null);
  }
}

export function storeListingPrefs(prefs: StoredListingPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseListingPrefs(prefs)));
  } catch {
    /* ignore */
  }
}

export function storePaneListingPrefs(
  side: 'left' | 'right',
  pane: PaneListingPrefs,
  current?: StoredListingPrefs
): StoredListingPrefs {
  const base = current ?? loadStoredListingPrefs();
  const next = { ...base, [side]: parsePaneListingPrefs(pane) };
  storeListingPrefs(next);
  return next;
}
