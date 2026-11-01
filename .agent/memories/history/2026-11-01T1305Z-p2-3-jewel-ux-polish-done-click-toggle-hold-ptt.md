---
kind: checkpoint
created: 2026-11-01T13:05:58Z
agent: cursor
sha: 6e9d61a
branch: main
paths: [src/shared/voice-jewel.ts, src/renderer/main.tsx, docs/adr/0002-dual-voice-jewels.md]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1305Z-p2-3-jewel-ux-polish-done-click-toggle-hold-ptt
---
# Checkpoint: P2.3 jewel UX polish done: click-toggle + hold PTT, Esc cancel, listening/trans…

## Summary

P2.3 jewel UX polish done: click-toggle + hold PTT, Esc cancel, listening/transcribing on bus. P2 complete.

## Done

- Jewel pointer hold vs click-toggle (280ms)
- Esc cancel + max utterance timer
- Listening/transcribing CSS + transcript bus lines
- ADR-0002 updated; voice-jewel unit tests

## Next

- P4.1 electron-builder portable + NSIS
- P3.1 dual layouts

## Blockers

- (none)

## Decisions

- Short click starts and stays listening; hold ≥280ms releases to transcribe (PTT); second click always stops
