# ADR-0003: Local-first speech

## Status

Accepted

## Context

Cloud ASR adds latency and privacy risk. Term already supports builtin Whisper (Transformers.js worker) and OpenAI-compatible servers.

## Decision

v1 scaffold: **demo typed transcript** + optional **server ASR**. Builtin Whisper worker copied in a later ROADMAP slice. No cloud LLM in the file-operation path.

## Consequences

- Scaffold works offline for UI/fuzzy testing
- Server ASR reuses Term `speech-server` patterns
- Builtin model download cost deferred until jewels prove useful
