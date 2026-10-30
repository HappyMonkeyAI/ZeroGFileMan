# AGENTS — ZeroG FileMan

## Purpose

Build and maintain a local-first multi-pane voice-enabled file manager. Small vertical slices; docs and ADRs change with the code.

## Session start and end (Spine)

If the `spine` MCP is available, call `session_brief(project="<absolute path to this repo>")` first; use `get_section` / `recall` instead of reading PROGRESS.md or CONTEXT.md whole. Without the MCP, run `spine --project . brief`. Never block the session on Spine.

Before stopping meaningful work: `checkpoint` with agent name (`cursor`, etc.), done / next / blockers. Durable facts via `record_memory`.

## Coordination

Multi-agent work uses [ai-agent-teamwork-prompt](https://github.com/HappyMonkeyAI/ai-agent-teamwork-prompt): claim tasks, lock files, verify-complete. CLI profiles: `profiles/` in your local clone of that repo. For local LM Studio coding assists, prefer **opencode** against `LOCAL_LLM_BASE_URL` — do not trust a 4B model alone for Electron IPC security.

## Model escalation (ADR-0004 spirit)

Routine boilerplate → local Kestrel/OpenCode. Architecture, IPC, speech security → Cursor or stronger. Escalate once after separating environment failures from logic failures.

## IPC discipline

- Renderer talks only through `window.fileman` (preload)
- Main validates absolute paths (`resolveLocalPath`)
- Secrets (speech API key) stay in main `safeStorage` when added

## Verification ladder

1. V0 — typecheck
2. V1 — unit tests (pure modules)
3. V2 — build
4. V3 — manual dual-pane + jewel smoke
5. V4 — Owner adversarial pass when claiming Done

## Documentation spine

README, CONTEXT, AGENTS, MCP.md, PLAN.md, SPEC.md, ROADMAP.md, PROGRESS.md, `docs/adr/`, `research/`
