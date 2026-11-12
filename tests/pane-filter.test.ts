import { describe, expect, it } from 'vitest';
import { filterForNavigation } from '../src/shared/pane-filter.js';

describe('pane-filter', () => {
  it('clears the filter when the pane moves to a new directory', () => {
    expect(filterForNavigation('C:\\a', 'C:\\a\\b', 'node')).toBe('');
  });

  it('leaves the filter alone when the pane stays on the same path', () => {
    expect(filterForNavigation('C:\\a', 'C:\\a', 'node')).toBe('node');
  });

  it('keeps an empty filter empty', () => {
    expect(filterForNavigation('C:\\a', 'C:\\b', '')).toBe('');
  });
});
