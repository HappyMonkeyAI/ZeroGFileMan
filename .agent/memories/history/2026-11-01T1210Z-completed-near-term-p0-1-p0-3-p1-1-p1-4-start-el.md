---
kind: checkpoint
created: 2026-11-01T12:10:43Z
agent: cursor
sha: 871c2d1
branch: main
paths: [scripts/start-electron.mjs, src/shared/pane-history.ts, src/renderer/main.tsx, docs/adr/0004-f5-copy-to-other-pane.md, PROGRESS.md, ROADMAP.md]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1210Z-completed-near-term-p0-1-p0-3-p1-1-p1-4-start-el
---
# Checkpoint: Completed near-term P0.1–P0.3 + P1.1–P1.4: start-electron bypass, pane history,…

## Summary

Completed near-term P0.1–P0.3 + P1.1–P1.4: start-electron bypass, pane history, F5/F6 copy/move to other pane, SPEC smoke notes, ROADMAP updated. Pushed 871c2d1.

## Done

- P0.1 menu-hide pushed (554953e)
- P0.3 start-electron.mjs + package.json start
- P1.1 per-pane Back/Forward + tests
- P1.2 Tab pane switch
- P1.3 F-keys F2/F5/F6/F7/Del
- P1.4 Copy→/Move→ opposing pane + ADR-0004
- P0.2 SPEC smoke table in PROGRESS
- typecheck/test/build green; push 871c2d1

## Next

- P1.5 editable favorites
- P1.6 Ctrl+K focus global jump
- P2.1 builtin Whisper

## Blockers

- (none)

## Decisions

- F5/F6 = copy/move to other pane; refresh is Ctrl+R (ADR-0004)
- npm start uses local electron.exe via scripts/start-electron.mjs
