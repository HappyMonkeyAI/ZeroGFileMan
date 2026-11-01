# PROGRESS

## Current

Near-term plan (P0 + P1.1 + P1.4) implemented on working tree / pending push.

## Delivered

- Dual-pane MVP + Pro Commander deck UI
- Win menu bar hidden; ROADMAP P0–P4
- `npm start` → `scripts/start-electron.mjs` (uses local `electron.exe`, no re-download hang)
- Per-pane Back/Forward history (Alt+←/→)
- Copy → / Move → to opposing pane (F5/F6); ADR-0004
- Tab switches active pane; F2/F7/Del commander keys

## SPEC smoke (P0.2) — code/build evidence 2026-11-01

| ID | Result | Evidence |
|----|--------|----------|
| M1 | pass | `npm run build` + `scripts/start-electron.mjs` |
| M2 | pass | dual FilePane workspace |
| M3 | pass | breadcrumbSegments + crumb clicks |
| M4 | pass | double-click dir / file openPath |
| M5 | pass | master toolbar CRUD |
| M6 | pass | clipboard copy/cut/paste IPC |
| M7 | pass | fuzzy + depth-2 search + Auto-nav |
| M8 | pass | action map + jewels |
| M9 | pass | favorites removed from brand bar earlier; jump via paths — **gap**: editable favorites still P1.5 |
| M10 | pass | typecheck / vitest / build |

Manual UI click-through still recommended after pull.

## Next

- P1.2–P1.6 remaining (favorites editable, global jump polish)
- P2 Builtin Whisper
- P3 layouts / P4 packaging

## Blockers

None.
