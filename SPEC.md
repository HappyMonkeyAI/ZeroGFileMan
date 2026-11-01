# SPEC — ZeroG FileMan MVP

## Product

Local dual-pane file browser for developers with push-to-talk **Navigate** and **Action** jewels per pane.

## Acceptance — MVP

| ID | Behavior |
|----|----------|
| M1 | App launches sandboxed Electron window (`npm start` after build) |
| M2 | Two independent panes show directory listings |
| M3 | Clickable breadcrumb segments navigate to ancestors |
| M4 | Double-click directory enters it; files open with default app; `..` works |
| M5 | Toolbar: New folder, Rename, Delete (non-recursive dirs), Copy, Cut, Paste, Refresh, Copy path, Open, Notepad, Terminal |
| M6 | Cross-pane clipboard: Copy/Cut in one pane, Paste in the other |
| M7 | Navigate jewel: demo/server transcript → current listing fuzzy, else depth-2 shallow index; Auto-nav toggle |
| M8 | Action jewel: copy path / copy / cut / paste / delete / rename / new folder / open / notepad / cursor / terminal / reveal / refresh |
| M9 | Favorites jump (Home / Documents / development when present); add/remove; persist in userData |
| M10 | `typecheck`, unit tests, and `build` pass |

## Voice modes

- **Navigate:** match against current listing, then shallow tree (depth 2); Auto-nav or confirm
- **Action:** mapped commands; delete always confirms in UI

## Non-functional

- Local-first; speech audio only leaves machine if user configures a non-loopback server
- Keyboard/mouse sufficient without voice
- No recursive delete from a single click
