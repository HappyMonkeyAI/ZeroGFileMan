# PROGRESS

## Current

P1.5 editable favorites + P1.6 Ctrl+K jump on working tree / pending push.

## Delivered

- Dual-pane MVP + Pro Commander deck UI
- Win menu bar hidden; ROADMAP P0–P4
- `npm start` → `scripts/start-electron.mjs`
- Per-pane Back/Forward; Copy → / Move → (F5/F6); ADR-0004
- Favorites persisted in `userData/favorites.json` (seed Home/Documents/development)
- Global jump: Ctrl+K focus, Enter → absolute path or fuzzy navigate

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
| M9 | pass | favorites bar + userData persist (P1.5) |
| M10 | pass | typecheck / vitest / build |

## Next

- P2.1 Builtin Whisper
- P3 layouts / P4 packaging

## Blockers

None.
