# ROADMAP — ZeroG FileMan

Private repo: [HappyMonkeyAI/ZeroGFileMan](https://github.com/HappyMonkeyAI/ZeroGFileMan)

## Status

**MVP usable** for dual-pane browse + CRUD + voice jewels (demo/server ASR) + Pro Commander deck UI. Next work is polish, real local Whisper, and commander ergonomics — not greenfield scaffolding.

## Done

| ID | Slice | Notes |
|----|--------|--------|
| D1 | Agents Protocol spine | AGENTS, CONTEXT, SPEC, ADRs, DESIGN |
| D2 | Dual-pane local FS | List, breadcrumbs, filter, ACTIVE/TARGET |
| D3 | CRUD + cross-pane paste | mkdir, rename, delete (non-recursive), copy/cut/paste |
| D4 | Voice jewels | Navigate (depth-2 fuzzy) + Action command map; demo/server ASR |
| D5 | Pro Commander deck | Stitch tokens, master toolbar, transcript bus, status bar |
| D6 | Themes + icons | Deck / Light / Nord / Dracula; Term-style SVG icons |
| D7 | Hide native menu (Win) | Deck chrome is top surface; macOS keeps app menu |
| D8 | P0 + history + copy→other | Menu hide, start script, Back/Forward, F5/F6 to other pane (ADR-0004) |
| D9 | Favorites + Ctrl+K jump | userData favorites; brand-bar jump + fuzzy Enter |
| D10 | Builtin Whisper worker | Transformers.js voice-worker; demo / builtin / server |
| D11 | Speech settings + safeStorage key | Precision/device/silence/max; server key encrypted |
| D12 | Jewel UX polish | Click-toggle + hold PTT; Esc cancel; bus listening state |

## Near-term (ordered)

### P0 — Ship confidence

| ID | Task | Acceptance | Status |
|----|------|------------|--------|
| P0.1 | Commit menu-hide + DESIGN sync | Pushed to `main` | done |
| P0.2 | SPEC smoke notes | M1–M10 in PROGRESS | done (M9 favorites gap noted) |
| P0.3 | Fix Electron `npm start` hang | `node scripts/start-electron.mjs` uses local binary | done |

### P1 — Commander ergonomics (highest user value)

| ID | Task | Acceptance | Status |
|----|------|------------|--------|
| P1.1 | History: Back / Forward per pane | Alt+Left/Right + toolbar | done |
| P1.2 | Tab switches active pane | Tab focus LEFT ↔ RIGHT | done |
| P1.3 | F-keys like classic commanders | F2 rename, F5 copy→, F6 move→, F7 mkdir, Del | done (ADR-0004) |
| P1.4 | Copy/Move **to other pane** | Copy → / Move → toolbar + F5/F6 | done |
| P1.5 | Editable favorites | Persist bookmarks in userData | done |
| P1.6 | Global jump (⌘K / Ctrl+K) | Focus brand-bar search; Enter → Navigate | done |

### P2 — Voice that works offline

| ID | Task | Acceptance | Status |
|----|------|------------|--------|
| P2.1 | Builtin Whisper worker | Term `voice-worker` + Transformers.js; demo / builtin / server | done |
| P2.2 | Speech settings UI | Model pick, silence threshold, max utterance; key in `safeStorage` | done |
| P2.3 | Jewel UX polish | Push-to-talk hold or click-toggle; listening state in transcript bus | done |

### P3 — Layout & density

| ID | Task | Acceptance |
|----|------|------------|
| P3.1 | Split layouts | Adapt Term `pane-layout`: dual vertical (default), dual horizontal, single maximize |
| P3.2 | Optional 4-pane grid | Only after dual layouts feel solid |
| P3.3 | Collapsible transcript drawer | Height persist; collapse to one status line |
| P3.4 | Column sort | Name / size / modified click-to-sort; persist per pane |

### P4 — Packaging & polish

| ID | Task | Acceptance |
|----|------|------------|
| P4.1 | electron-builder | Portable + NSIS x64; appId already `com.happymonkeyai.zerogfileman` |
| P4.2 | App icon | Distinct FileMan icon (not Term’s) |
| P4.3 | README quickstart | Screenshots optional; clear `npm start` path |
| P4.4 | CI | GitHub Action: typecheck + test + build on push |

## Later / park

- Multi-select + drag-drop between panes  
- Recursive delete with explicit danger modal (default stays non-recursive)  
- Permissions / owner columns (platform-accurate, not fake Unix on NTFS)  
- SFTP pane (borrow SFTP / Term patterns)  
- Shared `@zerog/speech` / `@zerog/workspace-layout` packages  
- spine-design UI baselines  
- Wake-word / always-on mic (out of scope unless accessibility-driven)

## Suggested next slice

**P4.1 packaging** (electron-builder), then **P3.1 layouts**.

## Task board seed

Mirror open items into `.agent-tasks.json` when running multi-agent teamwork; Spine `tasks` stays read-only view of project docs.
