/** Listing presentation: Details / Icons / Thumbnails + scale. */

export type ListingViewMode = 'details' | 'icons' | 'thumbnails';

export const LISTING_VIEW_MODES: ListingViewMode[] = ['details', 'icons', 'thumbnails'];

export const VIEW_SCALE_MIN = 0.6;
export const VIEW_SCALE_MAX = 2.5;
export const VIEW_SCALE_STEP = 0.1;
export const DEFAULT_VIEW_SCALE = 1;

/** Skip decoding huge images for thumbnails (bytes). */
export const THUMBNAIL_MAX_BYTES = 8 * 1024 * 1024;

const THUMB_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'ico'
]);

export function isListingViewMode(value: unknown): value is ListingViewMode {
  return typeof value === 'string' && (LISTING_VIEW_MODES as string[]).includes(value);
}

export function clampViewScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VIEW_SCALE;
  const stepped = Math.round(value / VIEW_SCALE_STEP) * VIEW_SCALE_STEP;
  return Math.min(VIEW_SCALE_MAX, Math.max(VIEW_SCALE_MIN, Number(stepped.toFixed(2))));
}

export function stepViewScale(current: number, direction: 1 | -1): number {
  return clampViewScale(current + direction * VIEW_SCALE_STEP);
}

export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/** Can we attempt a thumbnail for this entry? */
export function isThumbnailCandidate(
  name: string,
  size: number,
  kind: 'file' | 'directory' | 'symlink'
): boolean {
  if (kind !== 'file') return false;
  if (size <= 0 || size > THUMBNAIL_MAX_BYTES) return false;
  return THUMB_EXTENSIONS.has(fileExtension(name));
}

export function iconPixelSize(scale: number): number {
  return Math.round(40 * clampViewScale(scale));
}

export function thumbPixelSize(scale: number): number {
  return Math.round(88 * clampViewScale(scale));
}
