/** Hold longer than this on a jewel → push-to-talk (stop on release). */
export const JEWEL_HOLD_MS = 280;

/**
 * After pointer-up on a jewel, should recording stop?
 *
 * - Second click / already-listening press → always stop (`releaseWillStop`)
 * - First press held past threshold → push-to-talk stop
 * - Short first click → leave listening (click-toggle)
 */
export function shouldStopJewelOnRelease(options: {
  releaseWillStop: boolean;
  heldMs: number;
  holdThresholdMs?: number;
}): boolean {
  const threshold = options.holdThresholdMs ?? JEWEL_HOLD_MS;
  return options.releaseWillStop || options.heldMs >= threshold;
}
