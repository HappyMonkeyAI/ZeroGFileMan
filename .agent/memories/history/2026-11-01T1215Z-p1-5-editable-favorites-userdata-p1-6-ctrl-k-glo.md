---
kind: checkpoint
created: 2026-11-01T12:15:34Z
agent: cursor
sha: bbd2fdb
branch: main
paths: [src/main/favorites-store.ts, src/shared/favorites.ts, src/renderer/main.tsx, tests/favorites.test.ts]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1215Z-p1-5-editable-favorites-userdata-p1-6-ctrl-k-glo
---
# Checkpoint: P1.5 editable favorites (userData) + P1.6 Ctrl+K global jump done; typecheck/te…

## Summary

P1.5 editable favorites (userData) + P1.6 Ctrl+K global jump done; typecheck/tests/build green.

## Done

- P1.5 favorites IPC + store + chips UI (Ctrl+D add)
- P1.6 jumpQuery + Ctrl+K focus + Enter absolute/fuzzy
- favorites unit tests; ROADMAP/PROGRESS/SPEC updated

## Next

- P2.1 Builtin Whisper voice-worker
- P4.1 electron-builder
- P3.1 layouts

## Blockers

- (none)

## Decisions

- Favorites live in app.getPath('userData')/favorites.json; empty file means user cleared all
- Ctrl+K focuses jump even while typing elsewhere
