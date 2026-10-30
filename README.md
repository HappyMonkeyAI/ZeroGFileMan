# ZeroG FileMan

Local-first, multi-pane developer file manager with **dual voice jewels** per pane (Navigate / Action). Sister to [ZeroG Terminal](https://github.com/HappyMonkeyAI/ZeroGTerm) and ZeroG SFTP — greenfield app, not a fork.

## Quick start

```bash
npm install
npm run build
npm start
```

Dev (main watch + Vite):

```bash
npm run dev
# other terminal:
npm start
```

## What it does (scaffold)

- Dual local panes with clickable breadcrumbs
- List / enter directories / copy path
- Per-pane **Navigate** and **Action** mic jewels (speech → fuzzy match / command preview)
- Speech: demo typed transcript, or OpenAI-compatible transcription server

## Docs

| File | Role |
|------|------|
| [CONTEXT.md](CONTEXT.md) | Stack, rules, architecture |
| [AGENTS.md](AGENTS.md) | Agent workflow + Spine |
| [SPEC.md](SPEC.md) | v1 acceptance |
| [PLAN.md](PLAN.md) | Current scaffold plan |
| [ROADMAP.md](ROADMAP.md) | Next slices |
| [MCP.md](MCP.md) | Intent → MCP routing |
| [docs/adr/](docs/adr/) | Decisions |

## License

MIT
