import { describe, expect, it } from 'vitest';
import { JEWEL_HOLD_MS, shouldStopJewelOnRelease } from '../src/shared/voice-jewel.js';

describe('shouldStopJewelOnRelease', () => {
  it('stops on a second click even if the hold was short', () => {
    expect(
      shouldStopJewelOnRelease({ releaseWillStop: true, heldMs: 40 })
    ).toBe(true);
  });

  it('stops after a long hold (push-to-talk)', () => {
    expect(
      shouldStopJewelOnRelease({ releaseWillStop: false, heldMs: JEWEL_HOLD_MS })
    ).toBe(true);
    expect(
      shouldStopJewelOnRelease({ releaseWillStop: false, heldMs: JEWEL_HOLD_MS + 50 })
    ).toBe(true);
  });

  it('keeps listening after a short first click', () => {
    expect(
      shouldStopJewelOnRelease({ releaseWillStop: false, heldMs: 80 })
    ).toBe(false);
  });
});
