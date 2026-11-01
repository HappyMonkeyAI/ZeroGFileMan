import { describe, expect, it } from 'vitest';
import {
  clampTranscriptHeight,
  effectiveTranscriptHeight,
  parseTranscriptDrawerState,
  TRANSCRIPT_COLLAPSED_HEIGHT,
  TRANSCRIPT_HEIGHT_DEFAULT
} from '../src/shared/transcript-drawer.js';

describe('transcript drawer', () => {
  it('clamps height', () => {
    expect(clampTranscriptHeight(10)).toBe(72);
    expect(clampTranscriptHeight(999)).toBe(360);
    expect(clampTranscriptHeight(140)).toBe(140);
  });

  it('parses prefs with defaults', () => {
    expect(parseTranscriptDrawerState(null)).toEqual({
      collapsed: false,
      height: TRANSCRIPT_HEIGHT_DEFAULT
    });
    expect(parseTranscriptDrawerState({ collapsed: true, height: 180 })).toEqual({
      collapsed: true,
      height: 180
    });
  });

  it('collapses to one status line unless settings open', () => {
    const collapsed = { collapsed: true, height: 120 };
    expect(effectiveTranscriptHeight(collapsed, false)).toBe(TRANSCRIPT_COLLAPSED_HEIGHT);
    expect(effectiveTranscriptHeight(collapsed, true)).toBe(260);
  });
});
