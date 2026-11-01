# ADR-0002: Dual voice jewels (Navigate vs Action)

## Status

Accepted

## Context

Term uses one mic that types into a PTY. FileMan needs directory navigation and OS/file actions as distinct intents. A single mic plus intent classifier adds latency and error modes early.

## Decision

Each pane exposes **two** voice jewels: **Navigate** (fuzzy path match) and **Action** (command map).

Interaction (P2.3):

- **Click-toggle** — short press starts listening; press again to stop and transcribe
- **Push-to-talk** — hold past ~280ms; release stops and transcribes
- **Esc** cancels without transcribing; max utterance auto-stops from speech settings
- Listening / transcribing states are mirrored on the transcript bus

Keyboard remains complete without either jewel.

## Consequences

- Clearer UX; simpler routing of transcripts
- Slightly denser chrome per pane
- Intent classification deferred; can merge later if evidence warrants
