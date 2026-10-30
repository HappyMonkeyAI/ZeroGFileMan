# ADR-0002: Dual voice jewels (Navigate vs Action)

## Status

Accepted

## Context

Term uses one mic that types into a PTY. FileMan needs directory navigation and OS/file actions as distinct intents. A single mic plus intent classifier adds latency and error modes early.

## Decision

Each pane exposes **two** push-to-talk controls: **Navigate** (fuzzy path match) and **Action** (command map). Keyboard remains complete without either.

## Consequences

- Clearer UX; simpler routing of transcripts
- Slightly denser chrome per pane
- Intent classification deferred; can merge later if evidence warrants
