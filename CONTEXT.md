# CONTEXT — ZeroG FileMan

## What this is

A Windows-first Electron file manager for developers: multi-pane local browsing, Explorer-style breadcrumbs, and **dual push-to-talk voice jewels** (Navigate vs Action) per pane. Local-first speech; no cloud agent in the file-op path for v1.

## Stack

- Electron 43, Vite 7, React 19, TypeScript (NodeNext main + Vite bundler renderer)
- Main process owns all filesystem IPC (`local-fs`); renderer sandboxed
- Speech: `VoiceRecorder` + optional OpenAI-compatible transcription server; demo typed-transcript mode for offline UI testing
- Design tokens aligned with ZeroG Terminal (dark canvas, Inter, icon chrome)

## Non-negotiables

- Never commit `.env`, API keys, or speech secrets
- Absolute paths only through `resolveLocalPath`; no renderer Node FS
- Voice is never required for any core action (keyboard + mouse complete)
- Destructive actions confirm; no recursive delete from a single click
- Prefer Spine `session_brief` / `checkpoint` over dumping whole PROGRESS.md

## Architecture (resolved)

- **Greenfield** repo — copy Term patterns; do not fork PTY/SSH/MCP stack ([ADR-0001](docs/adr/0001-greenfield-not-fork.md))
- **Dual jewels** per pane — Navigate (fuzzy path) vs Action (command map) ([ADR-0002](docs/adr/0002-dual-voice-jewels.md))
- **Local-first speech** — demo or server ASR; builtin Whisper worker later ([ADR-0003](docs/adr/0003-local-first-speech.md))

## What not to do

- Do not add node-pty / SSH / in-app MCP to this scaffold unless tasked
- Do not silently execute voice Action commands without preview/confirm for destructive ops
- Do not treat cloud LLM file agents as the navigation path
- Do not extract `@zerog/*` packages until APIs stabilize across siblings

## Verification

`npm run typecheck` → `npm test` → `npm run build` → `npm start` dual-pane smoke → voice jewel demo transcript → fuzzy highlight
