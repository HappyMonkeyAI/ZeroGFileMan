# ADR-0001: Greenfield app, not a ZeroG Term fork

## Status

Accepted

## Context

ZeroG Term already has pane layout, speech, and local-fs, but `main.tsx` and main process are dominated by PTY, SSH, screen, and MCP. Forking would drag unrelated native deps and a monolith UI.

## Decision

Create **zerogfileman** as a greenfield Electron app. Copy/adapt pure modules (`local-fs`, path helpers, speech, layout rules, design tokens). Do not fork the Term repository.

## Consequences

- Faster scaffold; smaller attack surface
- Some duplication until shared packages are justified
- Must keep DESIGN/IPC discipline aligned manually with Term
