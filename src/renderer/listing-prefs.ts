import {
  clampViewScale,
  DEFAULT_VIEW_SCALE,
  isListingViewMode,
  type ListingViewMode
} from '../shared/listing-view.js';

export type ListingPrefs = {
  mode: ListingViewMode;
  scale: number;
};

const STORAGE_KEY = 'zerogfileman.listing';

export const DEFAULT_LISTING_PREFS: ListingPrefs = {
  mode: 'details',
  scale: DEFAULT_VIEW_SCALE
};

export function parseListingPrefs(raw: unknown): ListingPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LISTING_PREFS };
  const source = raw as Partial<ListingPrefs>;
  return {
    mode: isListingViewMode(source.mode) ? source.mode : DEFAULT_LISTING_PREFS.mode,
    scale: clampViewScale(typeof source.scale === 'number' ? source.scale : DEFAULT_VIEW_SCALE)
  };
}

export function loadStoredListingPrefs(): ListingPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LISTING_PREFS };
    return parseListingPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LISTING_PREFS };
  }
}

export function storeListingPrefs(prefs: ListingPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parseListingPrefs(prefs)));
  } catch {
    /* ignore */
  }
}
