# DESIGN — ZeroG FileMan

## Direction

**Pro Commander** dual-pane: dense Norton/Total Commander workflow with a developer “deck” dark skin (from Google Stitch mockup, 2026-10-30). Keyboard-first; voice jewels are secondary.

## Tokens (dark / deck — default)

| Token | Value |
|-------|-------|
| `--bg` / deck.base | `#070b12` |
| `--panel` / surface | `#0d1320` |
| `--panel-2` / elevated | `#131b2c` |
| `--border` | `#1e2b42` |
| `--divider` | `#162236` |
| `--accent` | `#06b6d4` |
| `--text` | slate-200-ish `#e2e8f0` |
| `--muted` | `#94a3b8` |
| Font UI | Inter |
| Font data | JetBrains Mono |

Light / Nord / Dracula remain alternate `data-theme` skins; deck is default dark.

## Layout

1. Native Electron menu (File/Edit/View/…) — no fake macOS traffic lights on Windows  
2. Compact brand + status strip (optional global jump later)  
3. Master toolbar: nav · CRUD · clipboard · launchers · toggles  
4. Dual panes: ACTIVE/TARGET badges, breadcrumbs, filter, mono listing, pane footer  
5. Transcript & action bus drawer (status/voice log)  
6. Status bar: pane counts · N/A hints · disk optional later  

## Do

- Cyan inset glow on the active pane only  
- Icon + short label on primary toolbar actions; hotkey hints where cheap  
- Persist theme in localStorage  

## Don’t

- Fake Rust engine / CPU / RAM meters  
- Dashboard chrome that overshadows the dual listing  
- Purple glow stacks; Inter-only default stacks without mono for paths  
