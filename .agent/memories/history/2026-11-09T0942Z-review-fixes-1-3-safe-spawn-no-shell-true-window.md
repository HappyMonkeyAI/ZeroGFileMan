---
kind: checkpoint
created: 2026-11-09T09:42:05Z
agent: claude-code
sha: 92cbfd0
branch: fix/review-critical-ipc-spawn
paths: [src/main/safe-spawn.ts, src/main/app-origin.ts, src/main/main.ts, src/main/terminal-launch.ts, src/renderer/main.tsx, src/shared/file-op.ts]
verification: {V0: pass, V1: pass, V2: pass}
id: 2026-11-09T0942Z-review-fixes-1-3-safe-spawn-no-shell-true-window
---
# Checkpoint: Review fixes 1-3: safe spawn (no shell:true), window/IPC locked to app page, fi…

## Summary

Review fixes 1-3: safe spawn (no shell:true), window/IPC locked to app page, file-op errors reported

## Done

- safe-spawn.ts env-var cmd shim; app-origin.ts navigation+IPC sender guard; file-op.ts runReported; 4 new test files (82 tests)

## Next

- V3 manual smoke on branch fix/review-critical-ipc-spawn (approve electron install script); then EXDEV move, case-only rename, name validation

## Blockers

- (none)

## Decisions

- Never spawn with shell:true; Windows shims get each argument via a ZEROG_ARG_n env var
- IPC handlers registered via handle() which refuses senders whose frame URL is not the app page
