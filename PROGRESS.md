# PROGRESS

## Current

P2.1 builtin Whisper worker landed; next is speech settings polish / packaging.

## Delivered

- Dual-pane MVP + Pro Commander deck UI + favorites + Ctrl+K jump
- History + F5/F6 copy/move (ADR-0004)
- Builtin Whisper via Transformers.js module worker (`voice-worker.ts`); engines: demo / builtin / server

## SPEC smoke (P0.2) — code/build evidence 2026-11-01

| ID | Result | Evidence |
|----|--------|----------|
| M1–M10 | pass | see prior notes; M9 favorites done |
| Voice | pass | SpeechClient tests + builtin engine option |

## Next

- P2.2 Speech settings UI (precision/device/API key in safeStorage)
- P4.1 electron-builder / P3.1 layouts

## Blockers

None. First builtin transcription downloads the selected HF model (~41 MB for tiny.en q8).
