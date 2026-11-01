import { describe, expect, it } from 'vitest';
import {
  clampSplitRatio,
  parseWorkspaceLayoutState,
  setLayout,
  toggleMaximize,
  workspaceGridTemplate
} from '../src/shared/pane-layout.js';

describe('pane-layout', () => {
  it('clamps ratios and parses defaults', () => {
    expect(clampSplitRatio(0.05)).toBe(0.2);
    expect(clampSplitRatio(0.95)).toBe(0.8);
    expect(parseWorkspaceLayoutState(null)).toEqual({
      layout: 'split-v',
      maximized: null,
      ratio: 0.5
    });
  });

  it('builds grid templates for vertical and horizontal splits', () => {
    expect(workspaceGridTemplate({ layout: 'split-v', maximized: null, ratio: 0.4 })).toEqual({
      columns: '40.00% 6px 60.00%',
      rows: '1fr'
    });
    expect(workspaceGridTemplate({ layout: 'split-h', maximized: null, ratio: 0.5 })).toEqual({
      columns: '1fr',
      rows: '50.00% 6px 50.00%'
    });
    expect(workspaceGridTemplate({ layout: 'split-v', maximized: 'left', ratio: 0.5 })).toEqual({
      columns: '1fr',
      rows: '1fr'
    });
  });

  it('toggles maximize and clears it when changing layout', () => {
    const maxed = toggleMaximize({ layout: 'split-v', maximized: null, ratio: 0.5 }, 'right');
    expect(maxed.maximized).toBe('right');
    expect(toggleMaximize(maxed, 'right').maximized).toBeNull();
    expect(setLayout(maxed, 'split-h')).toEqual({
      layout: 'split-h',
      maximized: null,
      ratio: 0.5
    });
  });
});
