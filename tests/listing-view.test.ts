import { describe, expect, it } from 'vitest';
import {
  clampViewScale,
  iconPixelSize,
  isListingViewMode,
  isThumbnailCandidate,
  stepViewScale,
  thumbPixelSize,
  VIEW_SCALE_MAX,
  VIEW_SCALE_MIN
} from '../src/shared/listing-view.js';
import { parseListingPrefs } from '../src/renderer/listing-prefs.js';

describe('listing-view', () => {
  it('validates modes and clamps scale', () => {
    expect(isListingViewMode('icons')).toBe(true);
    expect(isListingViewMode('tiles')).toBe(false);
    expect(clampViewScale(9)).toBe(VIEW_SCALE_MAX);
    expect(clampViewScale(0.1)).toBe(VIEW_SCALE_MIN);
    expect(stepViewScale(1, 1)).toBe(1.1);
    expect(stepViewScale(1, -1)).toBe(0.9);
  });

  it('sizes icons and thumbs from scale', () => {
    expect(iconPixelSize(1)).toBe(40);
    expect(thumbPixelSize(1)).toBe(88);
    expect(iconPixelSize(2)).toBe(80);
  });

  it('allows common image files under the size cap', () => {
    expect(isThumbnailCandidate('shot.PNG', 120_000, 'file')).toBe(true);
    expect(isThumbnailCandidate('shot.PNG', 20_000_000, 'file')).toBe(false);
    expect(isThumbnailCandidate('readme.md', 100, 'file')).toBe(false);
    expect(isThumbnailCandidate('photos', 0, 'directory')).toBe(false);
  });
});

describe('listing-prefs', () => {
  it('parses stored prefs with fallbacks', () => {
    expect(parseListingPrefs(null)).toEqual({ mode: 'details', scale: 1 });
    expect(parseListingPrefs({ mode: 'thumbnails', scale: 1.4 })).toEqual({
      mode: 'thumbnails',
      scale: 1.4
    });
  });
});
