import { describe, expect, it } from 'vitest';
import {
  applyListingClick,
  emptySelection,
  exclusiveSelect,
  primarySelected,
  pruneSelection,
  selectAll,
  selectRange,
  toggleSelect
} from '../src/shared/pane-selection.js';

const visible = ['a', 'b', 'c', 'd', 'e'];

describe('pane-selection', () => {
  it('exclusive select replaces the set', () => {
    expect(exclusiveSelect('b')).toEqual({ selected: ['b'], selectionAnchor: 'b' });
  });

  it('toggles membership on Ctrl click', () => {
    const one = exclusiveSelect('a');
    const two = toggleSelect(one, 'c');
    expect(two.selected).toEqual(['a', 'c']);
    expect(toggleSelect(two, 'a').selected).toEqual(['c']);
  });

  it('selects a contiguous Shift range from the anchor', () => {
    expect(selectRange(visible, 'b', 'd').selected).toEqual(['b', 'c', 'd']);
    expect(selectRange(visible, 'd', 'b').selected).toEqual(['b', 'c', 'd']);
  });

  it('applies modifiers in Explorer order', () => {
    const base = exclusiveSelect('b');
    expect(applyListingClick(base, visible, 'd', { ctrl: false, shift: true }).selected).toEqual([
      'b',
      'c',
      'd'
    ]);
    expect(applyListingClick(base, visible, 'd', { ctrl: true, shift: false }).selected).toEqual([
      'b',
      'd'
    ]);
    expect(applyListingClick(base, visible, 'd', { ctrl: false, shift: false }).selected).toEqual([
      'd'
    ]);
  });

  it('selects all visible names and prunes missing ones', () => {
    expect(selectAll(visible).selected).toEqual(visible);
    expect(pruneSelection(['a', 'gone', 'c'], new Set(visible))).toEqual(['a', 'c']);
    expect(primarySelected(['a', 'c'])).toBe('c');
    expect(emptySelection().selected).toEqual([]);
  });
});
