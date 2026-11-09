# ADR-0005: Server speech requests are made by main

## Status

Accepted (2026-11-09). Completes the "Bearer key via main" note in ADR-0003.

## Context

The speech server API key is stored encrypted by the main process (`safeStorage`). The renderer used to fetch the key over IPC (`speechKey:read`) and send the transcription request itself. As a result:

- the plaintext key was available to any code running in the page, which goes against the AGENTS.md rule that secrets stay in main;
- the page CSP had to allow `connect-src http: https:`, so the renderer could send data to any host.

## Decision

- The renderer sends `{ url, model, language, audio }` over `speech:transcribeServer`. Main validates the request (`parseServerTranscriptionInput`: http(s) URL, Float32Array audio, capped length), reads the key, and calls `transcribeViaServer` (now `src/shared/speech-server.ts`) with Node's `fetch`.
- `speechKey:read` and `window.fileman.readSpeechApiKey` are removed. The renderer can still save, clear and query the key's *status*, but cannot read it back.
- The page CSP narrows `connect-src` to `'self'` plus the Hugging Face hosts that the built-in Whisper engine downloads models from.

## Consequences

- The key never enters the renderer, and a compromised page cannot send data to arbitrary hosts with `fetch`.
- Requests from main are not subject to CORS, so speech servers that send no CORS headers now work.
- Any future feature that calls a user-configured endpoint from the page must go through main as well, or widen the CSP deliberately.
