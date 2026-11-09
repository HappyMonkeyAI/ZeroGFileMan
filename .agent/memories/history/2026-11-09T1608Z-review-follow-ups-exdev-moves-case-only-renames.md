---
kind: checkpoint
created: 2026-11-09T16:08:58Z
agent: claude-code
sha: 4ad7337
branch: fix/review-followups
paths: [src/main/local-fs.ts, src/shared/entry-name.ts, src/main/thumbnails.ts, src/shared/speech-server.ts, src/main/main.ts, index.html]
verification: {V0: pass, V1: pass, V2: pass, V3: pass}
id: 2026-11-09T1608Z-review-follow-ups-exdev-moves-case-only-renames
---
# Checkpoint: Review follow-ups: EXDEV moves, case-only renames, name validation, OS thumbnai…

## Summary

Review follow-ups: EXDEV moves, case-only renames, name validation, OS thumbnailer, server speech via main (ADR-0005)

## Done

- local-fs EXDEV fallback + samePath/isInside; entry-name.ts; createThumbnailFromPath; speech:transcribeServer IPC, speechKey:read removed, CSP connect-src narrowed; 117 tests; CDP smoke of key path, CSP, thumbnails

## Next

- Push branch fix/review-followups and open PR; manual check of builtin Whisper model download under new CSP

## Blockers

- (none)

## Decisions

- Server speech requests are made by main; renderer cannot read the API key (ADR-0005)
- Rename is same-folder only; moving goes through moveLocalEntry
