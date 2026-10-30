# MCP — ZeroG FileMan intent map

Listed ≠ mounted. Route by intent; fail open if a server is missing.

| Intent | Server | Notes |
|--------|--------|-------|
| Session warm-start / checkpoint / memory | `spine` | `session_brief`, `get_section`, `recall`, `checkpoint`, `record_memory` |
| UI capture / design drift (later) | `spine-design` | After first runnable chrome |
| Knowledge / prior notes | `neo4j-semantic-search` | Optional research |
| Host placement for heavy builds | `resource_sentinel` | Desktop pressure; peer admit only |
| Delegate local/remote agent tasks | `agent_communication` | `suggest_cli_for_task`, `submit_task` |
| Browser research | `browseros-neo` | Prefer over headless for live sites |
| Jules cloud jobs | `jules` | Optional; register project when needed |

## Local overlay

Copy `MCP.local.md` from AgentsProtocol template when needed (gitignored). Put LAN URLs only — no keys:

- LM Studio helper: `http://localhost:1234/v1`
- Optional ASR: operator-chosen OpenAI-compatible transcription URL
