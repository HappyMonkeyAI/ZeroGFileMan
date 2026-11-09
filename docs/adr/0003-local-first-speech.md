# ADR-0003: Local-first speech

## Status

Accepted

## Context

Cloud ASR adds latency and privacy risk. Term already supports builtin Whisper (Transformers.js worker) and OpenAI-compatible servers.

## Decision

Three engines:

1. **demo** — typed transcript for UI/fuzzy testing without a mic or model
2. **builtin** — Transformers.js Whisper in a module worker (`voice-worker.ts`), models from the Hugging Face hub, cached after first download
3. **server** — OpenAI-compatible `/v1/audio/transcriptions` (optional Bearer key added by main — see ADR-0005)

No cloud LLM in the file-operation path. Voice remains optional for every core action.

## Consequences

- Offline Navigate/Action jewels work once a builtin model is cached
- First builtin use downloads ~40 MB+ (tiny.en q8 default)
- Server ASR reuses Term `speech-server` patterns for LAN / whisper.cpp hosts
