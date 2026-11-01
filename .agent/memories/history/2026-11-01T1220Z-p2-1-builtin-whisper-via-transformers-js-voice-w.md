---
kind: checkpoint
created: 2026-11-01T12:20:33Z
agent: cursor
sha: aa21d2a
branch: main
paths: [src/renderer/voice-worker.ts, src/renderer/speech.ts, src/renderer/speech-models.ts, tests/speech.test.ts]
verification: {V0: pass, V1: pass, V2: pass, V3: skip, V4: pass}
id: 2026-11-01T1220Z-p2-1-builtin-whisper-via-transformers-js-voice-w
---
# Checkpoint: P2.1 builtin Whisper via Transformers.js voice-worker; demo/builtin/server engi…

## Summary

P2.1 builtin Whisper via Transformers.js voice-worker; demo/builtin/server engines; tests+build green.

## Done

- Copied Term voice-worker + speech-models
- SpeechClient worker path + unit tests
- Transcript bar: Builtin Whisper + model picker
- ADR-0003 updated; ROADMAP P2.1 done

## Next

- P2.2 speech settings (precision/device/API key safeStorage)
- P4.1 electron-builder
- P3.1 layouts

## Blockers

- (none)

## Decisions

- Default builtin model remains onnx-community/whisper-tiny.en q8 wasm
- Demo engine kept for offline UI testing without model download
