import { describe, expect, it } from 'vitest';
import {
  canGoBack,
  canGoForward,
  currentPath,
  initialHistory,
  peekBack,
  peekForward,
  pushPath,
  stepBack,
  stepForward
} from '../src/shared/pane-history.js';

describe('pane-history', () => {
  it('starts at the first path', () => {
    const h = initialHistory('C:\\a');
    expect(currentPath(h)).toBe('C:\\a');
    expect(canGoBack(h)).toBe(false);
    expect(canGoForward(h)).toBe(false);
  });

  it('pushes and truncates forward stack', () => {
    let h = initialHistory('C:\\a');
    h = pushPath(h, 'C:\\a\\b');
    h = pushPath(h, 'C:\\a\\b\\c');
    expect(currentPath(h)).toBe('C:\\a\\b\\c');
    h = stepBack(h)!;
    expect(currentPath(h)).toBe('C:\\a\\b');
    expect(peekBack(h)).toBe('C:\\a');
    expect(peekForward(h)).toBe('C:\\a\\b\\c');
    h = pushPath(h, 'C:\\a\\other');
    expect(canGoForward(h)).toBe(false);
    expect(h.history).toEqual(['C:\\a', 'C:\\a\\b', 'C:\\a\\other']);
  });

  it('ignores duplicate push of current path', () => {
    let h = initialHistory('C:\\a');
    h = pushPath(h, 'C:\\a');
    expect(h.history).toEqual(['C:\\a']);
  });

  it('steps forward after back', () => {
    let h = pushPath(initialHistory('C:\\a'), 'C:\\b');
    h = stepBack(h)!;
    h = stepForward(h)!;
    expect(currentPath(h)).toBe('C:\\b');
  });
});
