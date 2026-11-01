---
kind: checkpoint
created: 2026-11-01T13:50:24Z
agent: cursor
sha: b27f979
branch: main
paths: [src/shared/pane-layout.ts, src/renderer/main.tsx, src/renderer/layout-prefs.ts, tests/pane-layout.test.ts]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1350Z-p3-1-layouts-done-side-by-side-stacked-maximize
---
# Checkpoint: P3.1 layouts done: side-by-side / stacked / maximize + draggable gutter; prefs…

## Summary

P3.1 layouts done: side-by-side / stacked / maximize + draggable gutter; prefs persisted.

## Done

- WorkspaceLayout state + localStorage prefs
- Toolbar split-v/split-h/maximize
- Per-pane maximize pill
- Draggable gutter; double-click resets 50/50

## Next

- P4.2 distinct app icon
- P4.4 CI
- P3.3 transcript drawer / P3.4 column sort

## Blockers

- (none)

## Decisions

- Maximize clears when switching split orientation; ratio clamped 20–80%
