# Contributing

Thanks for taking a look. Issues and pull requests are welcome. This is a spare-time project, so reviews may take a while.

## Getting started

Requires Node.js 22 and npm.

```bash
npm install
npm run build
npm start
```

See the [README](README.md) for the dev loop (`npm run dev` plus `npm start`).

## Before opening a PR

```bash
npm run ci   # typecheck + unit tests + build, the same as GitHub Actions
```

Then try the change in the running app: both panes, and the voice jewels if you touched speech.

## Guidelines

- **Small vertical slices.** One behaviour per PR, with tests for pure logic in `tests/`.
- **IPC rules are non-negotiable.** The renderer only uses `window.fileman`. New file operations take absolute paths that main validates with `resolveLocalPath`. Secrets never cross to the renderer. See [SECURITY.md](SECURITY.md).
- **Docs move with code.** If you change a decision, add or update an ADR in [`docs/adr/`](docs/adr/). If you finish a roadmap item, update [ROADMAP.md](ROADMAP.md).
- **Security issues** go through private reporting, not public issues. See [SECURITY.md](SECURITY.md).

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
