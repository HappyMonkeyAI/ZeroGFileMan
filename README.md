# ZeroG FileMan

Local-first, multi-pane developer file manager with **dual voice jewels** per pane (Navigate / Action). Sister to [ZeroG Terminal](https://github.com/HappyMonkeyAI/ZeroGTerm) and ZeroG SFTP — greenfield app, not a fork.

**Repo:** [HappyMonkeyAI/ZeroGFileMan](https://github.com/HappyMonkeyAI/ZeroGFileMan)

## Quick start (dev)

```bash
npm install
npm run build
npm start
```

`npm start` launches the local Electron binary via `scripts/start-electron.mjs` (avoids the Electron CLI re-download hang).

Dev (main watch + Vite on `127.0.0.1:5174`):

```bash
npm run dev
# other terminal:
npm start
```

Checks:

```bash
npm run typecheck
npm test
npm run build
```

## Packaged Windows build

```bash
npm run package:win
```

Artifacts land in `release/`:

- `ZeroGFileMan-<version>-Setup.exe` — NSIS installer (choose install dir)
- `ZeroGFileMan-<version>-Portable.exe` — portable single file

Unsigned by default (`signAndEditExecutable: false`). App id: `com.happymonkeyai.zerogfileman`. Window/installer icon lives in `build/` (`npm run icon:render` regenerates png/ico from the SVG).

## What it does

- Dual local panes with breadcrumbs, history (Alt+←/→), favorites, Ctrl+K jump
- CRUD + cross-pane clipboard; F5/F6 copy/move to the other pane
- Per-pane **Navigate** / **Action** jewels: click-toggle or hold-to-talk; Esc cancels
- Speech engines: demo transcript, builtin Whisper (Transformers.js), or OpenAI-compatible server (API key in OS safeStorage)

## Docs

| File | Role |
|------|------|
| [CONTEXT.md](CONTEXT.md) | Stack, rules, architecture |
| [AGENTS.md](AGENTS.md) | Agent workflow + Spine |
| [SPEC.md](SPEC.md) | Acceptance |
| [ROADMAP.md](ROADMAP.md) | Next slices (layouts, view modes, CI) |
| [MCP.md](MCP.md) | Intent → MCP routing |
| [docs/adr/](docs/adr/) | Decisions |

## License

MIT
